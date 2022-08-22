
namespace SignalRServer.Hubs
{
    using System;
    using System.Threading.Tasks;

    public class MessageHub : Microsoft.AspNetCore.SignalR.Hub
    {
        public async Task SendMessageToAll(string message)
        {
            System.Console.WriteLine($"Inside MessageHub.SendMessageToAll: {message}");

            await Clients.All.SendCoreAsync("ReceivedMessage", 
                new MessagePoco[] 
                {
                    //new MessagePoco { Message = "Filler 01" },
                    //new MessagePoco { Message = "Filler 02" },
                    new MessagePoco { Message = message }
                });
        }

        public override Task OnConnectedAsync()
        {
            System.Console.WriteLine("Inside MessageHub.OnConnectedAsync ..");

            return base.OnConnectedAsync();
        }

        protected override void Dispose(bool disposing)
        {
            System.Console.WriteLine("Inside MessageHub.Dispose ..");
            
            base.Dispose(disposing);
        }

        public override Task OnDisconnectedAsync(Exception exception)
        {
            System.Console.WriteLine("Inside MessageHub.OnDisconnectedAsync ..");

            return base.OnDisconnectedAsync(exception);
        }
    }

    public class MessagePoco
    {
        public string Message { get; set; }
    }
}
