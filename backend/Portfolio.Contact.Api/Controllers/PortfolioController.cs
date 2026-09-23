using Microsoft.AspNetCore.Mvc;
using Portfolio.Contact.Api.Services;

namespace Portfolio.Contact.Api.Controllers;

[ApiController, Route("api/portfolio")]
public sealed class PortfolioController(PortfolioContent content) : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        try
        {
            var snapshot = content.Get();
            Response.Headers.CacheControl = "public, max-age=60";
            Response.Headers.ETag = snapshot.ETag;
            if (Request.Headers.IfNoneMatch.Any(value => value?.Split(',').Any(tag =>
                tag.Trim() == snapshot.ETag || tag.Trim() == "W/" + snapshot.ETag || tag.Trim() == "*") == true))
                return StatusCode(304);
            return Ok(new { schemaVersion = 1, data = snapshot.Data });
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or System.Text.Json.JsonException)
        {
            return StatusCode(503, new { code = "content_unavailable" });
        }
    }
}
