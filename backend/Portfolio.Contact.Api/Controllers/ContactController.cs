using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using MailKit.Net.Smtp;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Portfolio.Contact.Api.Models;
using Portfolio.Contact.Api.Services;

namespace Portfolio.Contact.Api.Controllers;

[ApiController, Route("api/contact"), EnableRateLimiting("contact")]
public sealed class ContactController(IContactEmailSender sender, SubmissionStore store, ILogger<ContactController> logger) : ControllerBase
{
    [HttpPost, RequestSizeLimit(32768)]
    public async Task<IActionResult> Send([FromBody] ContactRequest request)
    {
        if (!Guid.TryParse(Request.Headers["Idempotency-Key"], out var key) || key == Guid.Empty)
            return BadRequest(new { code = "invalid_request", errors = new { request = new[] { "A valid Idempotency-Key is required." } } });
        if (!string.IsNullOrWhiteSpace(request.Website)) return BadRequest(new { code = "invalid_request" });
        if (!sender.IsConfigured) return StatusCode(503, new { code = "sending_unavailable" });
        request.Normalize();
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(request))));
        var state = store.Begin(key, hash);
        var reference = key.ToString("N");
        if (state == "accepted") return Ok(new { status = "accepted", reference });
        if (state is "pending" or "conflict") return Conflict(new { code = state });
        if (state == "uncertain") return StatusCode(503, new { code = "delivery_uncertain", reference });
        if (state == "full") return StatusCode(503, new { code = "sending_unavailable" });
        // Continue briefly if the browser disconnects: the result remains available under the same key.
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(18));
        try
        {
            await sender.SendAsync(request, reference, timeout.Token);
            store.Complete(key, "accepted");
            logger.LogInformation("Contact {Reference} accepted by SMTP", reference);
            return Ok(new { status = "accepted", reference });
        }
        catch (Exception ex) when (ex is SmtpCommandException or MailKit.Security.AuthenticationException or MailKit.ServiceNotAuthenticatedException)
        {
            store.Remove(key);
            logger.LogWarning("Contact {Reference} rejected: {ErrorType}", reference, ex.GetType().Name);
            return StatusCode(503, new { code = "sending_unavailable", reference });
        }
        catch (Exception ex)
        {
            store.Complete(key, "uncertain");
            logger.LogWarning("Contact {Reference} unconfirmed: {ErrorType}", reference, ex.GetType().Name);
            return StatusCode(503, new { code = "delivery_uncertain", reference });
        }
    }
}
