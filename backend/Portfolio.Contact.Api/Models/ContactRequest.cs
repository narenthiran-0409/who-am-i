using System.ComponentModel.DataAnnotations;
using MimeKit;

namespace Portfolio.Contact.Api.Models;

public sealed class ContactRequest : IValidatableObject
{
    [Required, StringLength(120)] public string Name { get; set; } = "";
    [Required, StringLength(254), EmailAddress] public string Email { get; set; } = "";
    [Required, StringLength(160)] public string Subject { get; set; } = "";
    [Required, StringLength(5000)] public string Message { get; set; } = "";
    [StringLength(200)] public string? Website { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        foreach (var (key, value) in new[] { (nameof(Name), Name), (nameof(Email), Email), (nameof(Subject), Subject) })
            if (value?.Any(char.IsControl) == true)
                yield return new ValidationResult("Use a single line without control characters.", [key]);
        if (!MailboxAddress.TryParse(Email?.Trim(), out var mailbox) || mailbox.Address != Email?.Trim()
            || !(Email?.Trim().Split('@').LastOrDefault()?.Contains('.') ?? false))
            yield return new ValidationResult("Enter a valid email address.", [nameof(Email)]);
    }

    public void Normalize()
    {
        Name = Name.Trim(); Email = Email.Trim(); Subject = Subject.Trim(); Message = Message.Trim();
    }
}
