using System.Security.Cryptography;
using System.Text.Json;

namespace Portfolio.Contact.Api.Services;

public sealed record PortfolioSnapshot(Dictionary<string, JsonElement> Data, string ETag);

// Only this explicit public-content allowlist can be read. No caller-supplied paths.
public sealed class PortfolioContent(IWebHostEnvironment environment, IConfiguration configuration,
    ILogger<PortfolioContent> logger, TimeProvider clock)
{
    private static readonly string[] Names = ["site", "profile", "certifications", "skills", "journey", "projects", "contact"];
    private readonly object gate = new();
    private PortfolioSnapshot? snapshot;
    private DateTimeOffset nextRead;

    public PortfolioSnapshot Get()
    {
        lock (gate)
        {
            if (snapshot is not null && clock.GetUtcNow() < nextRead) return snapshot;
            nextRead = clock.GetUtcNow().AddSeconds(5);
            try
            {
                var folder = configuration["Portfolio:ContentDirectory"];
                folder = string.IsNullOrWhiteSpace(folder) ? Path.Combine(environment.ContentRootPath, "Content")
                    : Path.GetFullPath(folder, environment.ContentRootPath);
                var data = new Dictionary<string, JsonElement>();
                foreach (var name in Names)
                {
                    var file = new FileInfo(Path.Combine(folder, name + ".json"));
                    if (file.Length > 1024 * 1024) throw new InvalidDataException("Content file exceeds limit.");
                    using var document = JsonDocument.Parse(File.ReadAllText(file.FullName));
                    var expected = name is "skills" or "certifications" ? JsonValueKind.Array : JsonValueKind.Object;
                    if (document.RootElement.ValueKind != expected) throw new InvalidDataException("Invalid content shape.");
                    data.Add(name, document.RootElement.Clone());
                }
                var bytes = JsonSerializer.SerializeToUtf8Bytes(data);
                snapshot = new(data, "\"" + Convert.ToHexString(SHA256.HashData(bytes)) + "\"");
                return snapshot;
            }
            catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or JsonException)
            {
                logger.LogWarning("Portfolio content unavailable: {ErrorType}", ex.GetType().Name);
                if (snapshot is not null) return snapshot;
                throw;
            }
        }
    }
}
