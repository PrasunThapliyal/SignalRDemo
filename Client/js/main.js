
var connection;

async function initConnection() {
	console.log("inside initConnection");
	connection = new signalR.HubConnectionBuilder()
		.withUrl("/signalrdemo/messages")
		.configureLogging(signalR.LogLevel.Information)
		.build();
		
	
	connection.onclose(async () => {
		console.log("inside connection.onclose");
	});

	connection.on("ReceivedMessage", function(message) {
		console.log("inside connection.ReceivedMessage: " + message.message);
	});

};

async function startConnection() {
	console.log("inside startConnection");
	try {
		await connection.start();
		console.log("SignalR Connected.");
	} catch (err) {
		console.log("startConnection Exception");
		console.log(err);
	}
};

async function sendMessage() {
	var message = document.getElementById("message").value;
	console.log("sending message: " + message);
	connection.invoke("signalrdemo/SendMessageToAll", message);
};
