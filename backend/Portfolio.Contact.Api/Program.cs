using System.Net;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.HttpOverrides;
using Portfolio.Contact.Api.Services;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = 32768);
builder.Services.AddControllers();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler(options => options.ExceptionHandler = async context =>
    await Results.Problem(statusCode: 500, title: "The request could not be completed.").ExecuteAsync(context));
builder.Services.AddOptions<EmailOptions>().BindConfiguration("Email");
// Public content can run before SMTP is configured. Contact returns 503 until configured.
builder.Services.AddSingleton<PortfolioContent>();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<IContactEmailSender, SmtpEmailSender>();
builder.Services.AddSingleton<SubmissionStore>();
var origins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
if (origins.Length == 0 || origins.Any(origin => !Uri.TryCreate(origin, UriKind.Absolute, out var uri)
    || uri.Scheme is not ("http" or "https") || origin != uri.GetLeftPart(UriPartial.Authority)))
    throw new InvalidOperationException("Configure exact Cors:AllowedOrigins, without paths or wildcards.");
builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy.WithOrigins(origins)
    .WithMethods("GET", "POST").WithHeaders("Content-Type", "Idempotency-Key", "If-None-Match")
    .WithExposedHeaders("ETag")));
builder.Services.Configure<ForwardedHeadersOptions>(options => {
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.ForwardLimit = 1;
    foreach (var proxy in builder.Configuration.GetSection("Proxy:KnownProxies").Get<string[]>() ?? [])
        options.KnownProxies.Add(IPAddress.Parse(proxy));
});
builder.Services.AddRateLimiter(options => {
    options.RejectionStatusCode = 429;
    options.OnRejected = async (context, token) => {
        context.HttpContext.Response.Headers.RetryAfter = "600";
        await context.HttpContext.Response.WriteAsJsonAsync(new { code = "rate_limited" }, token);
    };
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetFixedWindowLimiter(context.Request.Path == "/api/portfolio" ? "content" : "contact", key => new FixedWindowRateLimiterOptions {
            PermitLimit = key == "content" ? 1000 : 100, Window = TimeSpan.FromMinutes(10), QueueLimit = 0
        }));
    options.AddPolicy("contact", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 5, Window = TimeSpan.FromMinutes(10), QueueLimit = 0 }));
});
var app = builder.Build();
if ((builder.Configuration.GetSection("Proxy:KnownProxies").Get<string[]>() ?? []).Length > 0)
    app.UseForwardedHeaders();
app.UseExceptionHandler();
if (!app.Environment.IsDevelopment()) { app.UseHsts(); app.UseHttpsRedirection(); }
app.Use(async (context, next) => {
    context.Response.Headers.CacheControl = "no-store";
    context.Response.Headers.XContentTypeOptions = "nosniff";
    await next();
});
app.UseCors();
app.UseRateLimiter();
app.MapControllers();
app.Run();

public partial class Program { }
