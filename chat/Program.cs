using Microsoft.AspNetCore.Mvc;
using Octokit;
using System.Net.Http.Headers;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/", () => "Hello Copilot!");

string yourGitHubAppName = "chatbot-alex-test";
string githubCopilotCompletionsUrl = 
    "https://api.githubcopilot.com/chat/completions";

app.MapPost("/agent", async (
    [FromHeader(Name = "X-GitHub-Token")] string githubToken, 
    [FromBody] Request userRequest) =>
{
    var octokitClient = new GitHubClient(
        new Octokit.ProductHeaderValue(yourGitHubAppName))
    {
        Credentials = new Credentials(githubToken)
    };

    var user = await octokitClient.User.Current();

    userRequest.Messages.Insert(0, new Message
    {
        Role = "system",
        Content = $"Start every response with the user's name, which is @{user.Login}"
    });

    userRequest.Messages.Insert(0, new Message
    {
        Role = "system",
        Content = "You are a helpful assistant that replies to " +
                  "user messages as if you were Blackbeard the Pirate."
    });

    var httpClient = new HttpClient();
    httpClient.DefaultRequestHeaders.Authorization = 
        new AuthenticationHeaderValue("Bearer", githubToken);
    userRequest.Stream = true;

    var copilotLLMResponse = await httpClient.PostAsJsonAsync(
        githubCopilotCompletionsUrl, userRequest);

    var responseStream = await copilotLLMResponse.Content.ReadAsStreamAsync();
    return Results.Stream(responseStream, "application/json");
});

app.MapGet("/callback", () => 
    "You may close this tab and return to GitHub.com " +
    "(where you should refresh the page and start a fresh chat). " +
    "If you're using VS Code or Visual Studio, return there.");

app.Run();
