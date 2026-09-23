using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Portfolio.Contact.Api.Tests;

public sealed class ContentClock : TimeProvider
{
    public DateTimeOffset Now = DateTimeOffset.UtcNow;
    public override DateTimeOffset GetUtcNow() => Now;
}

public sealed class PortfolioTests
{
    [Fact]
    public async Task Content_is_public_cacheable_and_never_exposes_email_settings()
    {
        using var app = new WebApplicationFactory<Program>();
        using var client = app.CreateClient();
        var response = await client.GetAsync("/api/portfolio");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync();
        using var parsed = JsonDocument.Parse(json);
        Assert.Equal(1, parsed.RootElement.GetProperty("schemaVersion").GetInt32());
        Assert.Equal(7, parsed.RootElement.GetProperty("data").EnumerateObject().Count());
        Assert.False(parsed.RootElement.GetProperty("data").TryGetProperty("Email", out _));
        Assert.DoesNotContain("smtp.gmail.com", json);
        Assert.True(response.Headers.CacheControl?.Public);
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/portfolio");
        request.Headers.IfNoneMatch.Add(response.Headers.ETag!);
        Assert.Equal(HttpStatusCode.NotModified, (await client.SendAsync(request)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/api/portfolio/appsettings.json")).StatusCode);
    }

    [Fact]
    public async Task Changed_JSON_refreshes_without_rebuild_and_bad_edits_retain_previous_snapshot()
    {
        var directory = Path.Combine(Path.GetTempPath(), "portfolio-test-" + Guid.NewGuid());
        Directory.CreateDirectory(directory);
        try
        {
            foreach (var name in new[] { "site", "profile", "journey", "projects", "contact", "skills", "certifications" })
                File.WriteAllText(Path.Combine(directory, name + ".json"), name is "skills" or "certifications" ? "[]" : "{}");
            var clock = new ContentClock();
            using var app = new WebApplicationFactory<Program>().WithWebHostBuilder(builder => {
                builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?> { ["Portfolio:ContentDirectory"] = directory }));
                builder.ConfigureServices(services => { services.RemoveAll<TimeProvider>(); services.AddSingleton<TimeProvider>(clock); });
            });
            using var client = app.CreateClient();
            var first = await client.GetAsync("/api/portfolio");
            File.WriteAllText(Path.Combine(directory, "profile.json"), "{\"name\":\"Live edit\"}");
            clock.Now = clock.Now.AddSeconds(6);
            var changed = await client.GetAsync("/api/portfolio");
            Assert.Contains("Live edit", await changed.Content.ReadAsStringAsync());
            Assert.NotEqual(first.Headers.ETag, changed.Headers.ETag);
            File.WriteAllText(Path.Combine(directory, "profile.json"), "{broken");
            clock.Now = clock.Now.AddSeconds(6);
            var recovered = await client.GetAsync("/api/portfolio");
            Assert.Equal(changed.Headers.ETag, recovered.Headers.ETag);
        }
        finally { Directory.Delete(directory, true); }
    }

    [Fact]
    public async Task Missing_content_returns_503_without_internal_paths()
    {
        using var app = new WebApplicationFactory<Program>().WithWebHostBuilder(builder => builder.ConfigureAppConfiguration((_, config) =>
            config.AddInMemoryCollection(new Dictionary<string, string?> { ["Portfolio:ContentDirectory"] = "/missing-portfolio-content" })));
        var response = await app.CreateClient().GetAsync("/api/portfolio");
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.DoesNotContain("/missing-portfolio-content", await response.Content.ReadAsStringAsync());
    }
}
