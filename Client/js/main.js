
var connection;

async function initConnection() {
	console.log("inside initConnection");
	let networkId = '0ba4ba8b-83b7-42b4-bff4-72ca35dd4a1c';
	let newClientIdAsGuid = '0417fd5c-7da5-40b0-b0b0-1384aefd0266';
	connection = new signalR.HubConnectionBuilder()
		.withUrl("/WebSocketsService/chats?networkDesignId={WebSocketsService/chats?networkDesignId="+networkId+"&clientId="+newClientIdAsGuid+"&negotiateVersion=1")
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
