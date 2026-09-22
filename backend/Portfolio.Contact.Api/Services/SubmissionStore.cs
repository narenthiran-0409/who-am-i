namespace Portfolio.Contact.Api.Services;

// Bounded, single-instance deduplication. No visitor PII is retained, only a hash.
public sealed class SubmissionStore
{
    private readonly object gate = new();
    private readonly Dictionary<Guid, Entry> entries = new();
    private sealed record Entry(string Hash, DateTimeOffset Expires, string State);

    public string Begin(Guid key, string hash)
    {
        lock (gate)
        {
            var now = DateTimeOffset.UtcNow;
            foreach (var expired in entries.Where(x => x.Value.Expires <= now).Select(x => x.Key).ToArray()) entries.Remove(expired);
            if (entries.TryGetValue(key, out var existing)) return existing.Hash == hash ? existing.State : "conflict";
            if (entries.Count >= 1000) return "full";
            entries[key] = new(hash, now.AddMinutes(15), "pending");
            return "new";
        }
    }

    public void Complete(Guid key, string state)
    {
        lock (gate) if (entries.TryGetValue(key, out var entry)) entries[key] = entry with { State = state };
    }

    public void Remove(Guid key) { lock (gate) entries.Remove(key); }
}
