using System.Net;
using System.Net.Security;
using System.Net.Sockets;
using System.Security.Authentication;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;
using MimeKit;
using Portfolio.Contact.Api.Models;
using Portfolio.Contact.Api.Services;

namespace Portfolio.Contact.Api.Tests;

public class SmtpTransportTests
{
    [Fact]
    public async Task ApiSubmissionDeliversThroughRealTlsSmtpToLocalMailbox()
    {
        using var rsa = RSA.Create(2048);
        var certificateRequest = new CertificateRequest("CN=localhost", rsa, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
        var san = new SubjectAlternativeNameBuilder(); san.AddDnsName("localhost");
        certificateRequest.CertificateExtensions.Add(san.Build());
        certificateRequest.CertificateExtensions.Add(new X509BasicConstraintsExtension(true, false, 0, true));
        using var certificate = certificateRequest.CreateSelfSigned(DateTimeOffset.UtcNow.AddMinutes(-5), DateTimeOffset.UtcNow.AddHours(1));
        using var trust = new X509Store(StoreName.Root, StoreLocation.CurrentUser);
        trust.Open(OpenFlags.ReadWrite);
        trust.Add(certificate);
        var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(20));
        var received = new StringBuilder();
        var authenticated = false;
        var recipient = "";
        var mailbox = Task.Run(async () => {
            using var connection = await listener.AcceptTcpClientAsync(timeout.Token);
            using var tls = new SslStream(connection.GetStream());
            await tls.AuthenticateAsServerAsync(new SslServerAuthenticationOptions {
                ServerCertificate = certificate, EnabledSslProtocols = SslProtocols.Tls12 | SslProtocols.Tls13
            }, timeout.Token);
            using var reader = new StreamReader(tls, Encoding.UTF8, leaveOpen: true);
            using var writer = new StreamWriter(tls, new UTF8Encoding(false), leaveOpen: true) { AutoFlush = true, NewLine = "\r\n" };
            await writer.WriteLineAsync("220 localhost test mailbox");
            while (await reader.ReadLineAsync(timeout.Token) is { } line) {
                if (line.StartsWith("EHLO")) await writer.WriteLineAsync("250-localhost\r\n250 AUTH PLAIN");
                else if (line.StartsWith("AUTH PLAIN ")) {
                    authenticated = Encoding.UTF8.GetString(Convert.FromBase64String(line[11..])).Contains("test-user\0test-password");
                    await writer.WriteLineAsync(authenticated ? "235 Authenticated" : "535 Rejected");
                }
                else if (line.StartsWith("MAIL FROM:")) await writer.WriteLineAsync("250 Sender accepted");
                else if (line.StartsWith("RCPT TO:")) { recipient = line; await writer.WriteLineAsync("250 Recipient accepted"); }
                else if (line == "DATA") {
                    await writer.WriteLineAsync("354 End with dot");
                    while (await reader.ReadLineAsync(timeout.Token) is { } data && data != ".") received.AppendLine(data.StartsWith("..") ? data[1..] : data);
                    await writer.WriteLineAsync("250 Message stored locally");
                }
                else if (line == "QUIT") { await writer.WriteLineAsync("221 Bye"); break; }
                else await writer.WriteLineAsync("500 Unsupported command");
            }
        }, timeout.Token);
        try {
            var settings = new EmailOptions {
                Host = "localhost", Port = ((IPEndPoint)listener.LocalEndpoint).Port, Security = "SslOnConnect",
                Username = "test-user", Password = "test-password", FromAddress = "sender@example.com", Recipient = "owner@example.com"
            };
            using var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder => {
                builder.UseEnvironment("Development");
                builder.ConfigureServices(services => {
                    services.RemoveAll<IContactEmailSender>();
                    services.AddSingleton<IContactEmailSender>(new SmtpEmailSender(Options.Create(settings)));
                });
            });
            using var client = factory.CreateClient();
            var key = Guid.NewGuid();
            client.DefaultRequestHeaders.Add("Idempotency-Key", key.ToString());
            var response = await client.PostAsJsonAsync("/api/contact", new ContactRequest {
                Name = "Test Visitor", Email = "visitor@example.com", Subject = "TLS integration test", Message = "Local mailbox delivery test."
            }, timeout.Token);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            await mailbox;
            Assert.True(authenticated);
            Assert.Contains("owner@example.com", recipient);
            using var stream = new MemoryStream(Encoding.UTF8.GetBytes(received.ToString()));
            using var mail = await MimeMessage.LoadAsync(stream, timeout.Token);
            Assert.Equal("visitor@example.com", mail.ReplyTo.Mailboxes.Single().Address);
            Assert.Contains("Local mailbox delivery test.", mail.TextBody);
            Assert.Equal(key.ToString("N"), mail.Headers["X-Portfolio-Reference"]);
        }
        finally {
            timeout.Cancel(); listener.Stop(); trust.Remove(certificate);
            try { await mailbox; } catch (Exception) when (timeout.IsCancellationRequested) { }
        }
    }
}
