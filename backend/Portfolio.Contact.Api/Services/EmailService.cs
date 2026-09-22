using System.Net;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;
using Portfolio.Contact.Api.Models;

namespace Portfolio.Contact.Api.Services;

public sealed class EmailOptions
{
    public string Host { get; set; } = "";
    public int Port { get; set; } = 587;
    public string Security { get; set; } = "StartTls";
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
    public string FromAddress { get; set; } = "";
    public string FromName { get; set; } = "Heisgn Berg Portfolio";
    public string Recipient { get; set; } = "";
    public bool IsConfigured => !string.IsNullOrWhiteSpace(Host) && Port is > 0 and <= 65535
        && Security is "StartTls" or "SslOnConnect"
        && !string.IsNullOrWhiteSpace(Username) && !string.IsNullOrWhiteSpace(Password)
        && IsMailbox(FromAddress) && IsMailbox(Recipient);
    private static bool IsMailbox(string value) => MailboxAddress.TryParse(value, out var box)
        && box.Address == value && !value.Any(char.IsControl);
}

public interface IContactEmailSender
{
    bool IsConfigured { get; }
    Task SendAsync(ContactRequest request, string reference, CancellationToken cancellationToken);
}

public sealed class SmtpEmailSender(IOptions<EmailOptions> options) : IContactEmailSender
{
    private readonly EmailOptions settings = options.Value;
    public bool IsConfigured => settings.IsConfigured;

    public static MimeMessage BuildMessage(ContactRequest request, string reference, EmailOptions settings)
    {
        var mail = new MimeMessage();
        mail.From.Add(new MailboxAddress(settings.FromName, settings.FromAddress));
        mail.To.Add(MailboxAddress.Parse(settings.Recipient));
        mail.ReplyTo.Add(new MailboxAddress(request.Name, request.Email));
        mail.Subject = $"[Portfolio] {request.Subject}";
        mail.Headers.Add("X-Portfolio-Reference", reference);
        var text = $"Name: {request.Name}\nEmail: {request.Email}\nSubject: {request.Subject}\n\n{request.Message}\n\nReference: {reference}";
        mail.Body = new BodyBuilder {
            TextBody = text,
            HtmlBody = "<div style=\"white-space:pre-wrap;font-family:system-ui,sans-serif\">" + WebUtility.HtmlEncode(text) + "</div>"
        }.ToMessageBody();
        return mail;
    }

    public async Task SendAsync(ContactRequest request, string reference, CancellationToken cancellationToken)
    {
        using var mail = BuildMessage(request, reference, settings);
        using var client = new SmtpClient { Timeout = 15000 };
        var security = settings.Security == "SslOnConnect" ? SecureSocketOptions.SslOnConnect : SecureSocketOptions.StartTls;
        await client.ConnectAsync(settings.Host, settings.Port, security, cancellationToken);
        await client.AuthenticateAsync(settings.Username, settings.Password, cancellationToken);
        await client.SendAsync(mail, cancellationToken);
        // SMTP acceptance already happened. A failed QUIT must not trigger a duplicate send.
        try { await client.DisconnectAsync(true, cancellationToken); }
        catch (Exception ex) when (ex is IOException or OperationCanceledException or MailKit.ProtocolException) { }
    }
}
