using System.Net;
using System.Net.Http.Json;
using MailKit.Net.Smtp;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Portfolio.Contact.Api.Models;
using Portfolio.Contact.Api.Services;

namespace Portfolio.Contact.Api.Tests;

public sealed class RecordingSender : IContactEmailSender
{
    public bool IsConfigured { get; set; } = true;
    public int Count;
    public Exception? Failure;
    public TaskCompletionSource? Hold;
    public ContactRequest? Received;
    public async Task SendAsync(ContactRequest request, string reference, CancellationToken token)
    {
        Interlocked.Increment(ref Count);
        Received = request;
        if (Hold is not null) await Hold.Task.WaitAsync(token);
        if (Failure is not null) throw Failure;
    }
}

public sealed class ContactFactory : WebApplicationFactory<Program>
{
    public RecordingSender Sender { get; } = new();
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.ConfigureServices(services => {
            services.RemoveAll<IContactEmailSender>();
            services.AddSingleton<IContactEmailSender>(Sender);
        });
    }
}

public class ContactTests
{
    private static object Valid => new { name = "  Test Visitor  ", email = "visitor@example.com", subject = "Project inquiry", message = "Hello from a portfolio visitor." };
    private static Task<HttpResponseMessage> Send(HttpClient client, object body, string? key = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/contact") { Content = JsonContent.Create(body) };
        request.Headers.Add("Idempotency-Key", key ?? Guid.NewGuid().ToString());
        return client.SendAsync(request);
    }

    [Fact]
    public async Task AcceptedRequestIsNormalizedAndDeduplicated()
    {
        using var factory = new ContactFactory(); using var client = factory.CreateClient();
        var key = Guid.NewGuid().ToString();
        var first = await Send(client, Valid, key);
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Contains("accepted", await first.Content.ReadAsStringAsync());
        Assert.Equal(HttpStatusCode.OK, (await Send(client, Valid, key)).StatusCode);
        Assert.Equal(1, factory.Sender.Count);
        Assert.Equal("Test Visitor", factory.Sender.Received!.Name);
        Assert.Equal(HttpStatusCode.Conflict, (await Send(client,
            new { name = "Other", email = "other@example.com", subject = "Changed", message = "Changed" }, key)).StatusCode);
    }

    [Theory]
    [InlineData("", "person@example.com", "Hi", "Hello")]
    [InlineData("Person", "invalid", "Hi", "Hello")]
    [InlineData("Person", "person@example.com", " ", "Hello")]
    [InlineData("Person", "person@example.com", "Hi", " ")]
    [InlineData("Person", "person@example.com", "Hi\r\nBcc:attacker@example.com", "Hello")]
    [InlineData("Person\nInjected", "person@example.com", "Hi", "Hello")]
    public async Task InvalidFieldsNeverReachEmail(string name, string email, string subject, string message)
    {
        using var factory = new ContactFactory(); using var client = factory.CreateClient();
        var response = await Send(client, new { name, email, subject, message });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(0, factory.Sender.Count);
    }

    [Theory]
    [InlineData("name", 121)] [InlineData("email", 255)] [InlineData("subject", 161)] [InlineData("message", 5001)]
    public async Task OversizedFieldsAreRejected(string field, int length)
    {
        using var factory = new ContactFactory(); using var client = factory.CreateClient();
        var body = new Dictionary<string, string> { ["name"] = "Test", ["email"] = "visitor@example.com", ["subject"] = "Hi", ["message"] = "Hello" };
        body[field] = new string('a', length);
        Assert.Equal(HttpStatusCode.BadRequest, (await Send(client, body)).StatusCode);
        Assert.Equal(0, factory.Sender.Count);
    }

    [Fact]
    public async Task HoneypotMissingKeyAndMalformedJsonAreRejected()
    {
        using var factory = new ContactFactory(); using var client = factory.CreateClient();
        Assert.Equal(HttpStatusCode.BadRequest, (await Send(client, new { name = "Bot", email = "bot@example.com", subject = "Hi", message = "Hello", website = "spam" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/contact", Valid)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsync("/api/contact", new StringContent("{", System.Text.Encoding.UTF8, "application/json"))).StatusCode);
        Assert.Equal(0, factory.Sender.Count);
    }

    [Fact]
    public async Task MissingConfigurationDoesNotClaimSuccess()
    {
        using var factory = new ContactFactory(); factory.Sender.IsConfigured = false;
        using var client = factory.CreateClient();
        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await Send(client, Valid)).StatusCode);
        Assert.Equal(0, factory.Sender.Count);
    }

    [Fact]
    public async Task ConcurrentDuplicateDoesNotSendTwice()
    {
        using var factory = new ContactFactory(); factory.Sender.Hold = new(TaskCreationOptions.RunContinuationsAsynchronously);
        using var client = factory.CreateClient();
        var key = Guid.NewGuid().ToString(); var first = Send(client, Valid, key);
        for (var i = 0; i < 100 && factory.Sender.Count == 0; i++) await Task.Delay(10);
        Assert.Equal(1, factory.Sender.Count);
        Assert.Equal(HttpStatusCode.Conflict, (await Send(client, Valid, key)).StatusCode);
        factory.Sender.Hold.SetResult();
        Assert.Equal(HttpStatusCode.OK, (await first).StatusCode);
        Assert.Equal(1, factory.Sender.Count);
    }

    [Fact]
    public async Task TimeoutIsUncertainAndRetryDoesNotResend()
    {
        using var factory = new ContactFactory(); factory.Sender.Failure = new OperationCanceledException();
        using var client = factory.CreateClient(); var key = Guid.NewGuid().ToString();
        var response = await Send(client, Valid, key);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Contains("delivery_uncertain", await response.Content.ReadAsStringAsync());
        await Send(client, Valid, key);
        Assert.Equal(1, factory.Sender.Count);
    }

    [Fact]
    public async Task ExplicitSmtpRejectionAllowsRetryAndDoesNotLeakDetails()
    {
        using var factory = new ContactFactory();
        factory.Sender.Failure = new SmtpCommandException(SmtpErrorCode.MessageNotAccepted, SmtpStatusCode.MailboxUnavailable, "private-provider-details");
        using var client = factory.CreateClient(); var key = Guid.NewGuid().ToString();
        var response = await Send(client, Valid, key);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.DoesNotContain("private-provider-details", await response.Content.ReadAsStringAsync());
        factory.Sender.Failure = null;
        Assert.Equal(HttpStatusCode.OK, (await Send(client, Valid, key)).StatusCode);
        Assert.Equal(2, factory.Sender.Count);
    }

    [Fact]
    public async Task SixthRequestIsRateLimitedEvenWithForgedForwardedHeader()
    {
        using var factory = new ContactFactory(); using var client = factory.CreateClient();
        for (var i = 0; i < 5; i++) {
            client.DefaultRequestHeaders.Remove("X-Forwarded-For");
            client.DefaultRequestHeaders.Add("X-Forwarded-For", $"198.51.100.{i}");
            Assert.Equal(HttpStatusCode.OK, (await Send(client, Valid)).StatusCode);
        }
        var response = await Send(client, Valid);
        Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);
        Assert.NotNull(response.Headers.RetryAfter);
        Assert.Equal(5, factory.Sender.Count);
    }

    [Theory]
    [InlineData("http://localhost:4173", true)]
    [InlineData("https://untrusted.example", false)]
    public async Task CorsOnlyAllowsConfiguredOrigins(string origin, bool allowed)
    {
        using var factory = new ContactFactory(); using var client = factory.CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Options, "/api/contact");
        request.Headers.Add("Origin", origin);
        request.Headers.Add("Access-Control-Request-Method", "POST");
        request.Headers.Add("Access-Control-Request-Headers", "Content-Type,Idempotency-Key");
        var response = await client.SendAsync(request);
        Assert.Equal(allowed, response.Headers.Contains("Access-Control-Allow-Origin"));
    }

    [Fact]
    public void MimeMessageUsesFixedRecipientReplyToAndEscapedHtml()
    {
        var settings = new EmailOptions { FromAddress = "sender@example.com", Recipient = "owner@example.com" };
        var request = new ContactRequest { Name = "Visitor", Email = "visitor@example.com", Subject = "Hello", Message = "<script>alert(1)</script> & Tamil: தமிழ்" };
        using var mail = SmtpEmailSender.BuildMessage(request, "test-reference", settings);
        Assert.Equal("sender@example.com", mail.From.Mailboxes.Single().Address);
        Assert.Equal("owner@example.com", mail.To.Mailboxes.Single().Address);
        Assert.Equal("visitor@example.com", mail.ReplyTo.Mailboxes.Single().Address);
        Assert.Contains(request.Message, mail.TextBody);
        Assert.Contains("&lt;script&gt;", mail.HtmlBody);
        Assert.DoesNotContain("<script>", mail.HtmlBody);
        Assert.Contains("test-reference", mail.TextBody);
    }

    [Fact]
    public void PlaintextOrMissingEmailConfigurationIsNotAccepted()
    {
        var options = new EmailOptions { Host = "smtp.example.com", Port = 587, Username = "user", Password = "test-only", FromAddress = "sender@example.com", Recipient = "owner@example.com" };
        Assert.True(options.IsConfigured);
        options.Security = "None";
        Assert.False(options.IsConfigured);
        options.Security = "StartTls"; options.Password = "";
        Assert.False(options.IsConfigured);
    }
}
