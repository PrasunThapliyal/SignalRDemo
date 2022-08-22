18 Aug 2022
===========

ref: Tutorial: Get started with ASP.NET Core SignalR
	https://docs.microsoft.com/en-us/aspnet/core/tutorials/signalr?view=aspnetcore-6.0&tabs=visual-studio

==========================================================
(#) Create a ASP.NET Core 3.1 WebAPI server (WeatherForecastController)
	This is our SignalR server listening on TCP 2612 (HTTP)
(#) Create a vanilla JS client using SignalR library
(#) Configure Nginx to host UI on port 80, define traffic forwarding to SignalR server at port 2612
Status: Complete

Next Steps:
	(#) Add SSL for HTTP and Websockets (Nginx on Windows)
Status: Complete
==========================================================


Step 1: Create SignalR server app
	Visual Studio 2022 -> New Project -> ASP.NET Web API -> Dotnet Core 3.1
	Add "Microsoft.AspNet.SignalR.Core" Version="2.4.3"
	Create class MessageHub : Microsoft.AspNetCore.SignalR.Hub

        public async Task SendMessageToAll(string message)
        {
            System.Console.WriteLine($"Inside MessageHub.SendMessageToAll: {message}");

            await Clients.All.SendCoreAsync("ReceivedMessage", new MessagePoco[] { new MessagePoco { Message = message } });
        }

	Note 1: The name of the method "SendMessageToAll" is what the Javascript client needs to know. In C#, this is SignalR's way to define routing for TCP packets
	Note 2: The name "ReceivedMessage" is what the JS client is listenig on, so C#/server should use the same name


	In Startup.cs
        public void ConfigureServices(IServiceCollection services)
        {
            services.AddControllers();
            services.AddSignalR();
        }

        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            //app.UseHttpsRedirection(); // This was required to not automatically redirect negotiate from HTTP to HTTPS (and thus giving CORS on UI)

            app.UseRouting();

            app.UseAuthorization();

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapHub<MessageHub>("/messages"); // This is the new way with current library
	Note 3: "messages" becomes the name of your hub - this is the 'Route' for the HTTP message that finally gets upgraded to WS

                endpoints.MapControllers();
            });

            //app.UseSignalR(config => {
            //    config.MapHub<MessageHub>("/messages");
            //});
        }

Step 2: Create a HTML / JS client
	Create a default HTML page (index.html) with buttons for Init, Connect, and Send Message. You don't need a button for Receive
	The Init handler should create a new object that is a handler for connection with the server

		async function initConnection() {
			console.log("inside initConnection");
			connection = new signalR.HubConnectionBuilder()
		Note 4: Match this with Note 3
				.withUrl("/messages")
				.configureLogging(signalR.LogLevel.Information)
				.build();
		
	
			connection.onclose(async () => {
				console.log("inside connection.onclose");
			});

		Note 5: Match this with Note 2
			connection.on("ReceivedMessage", function(message) {
				console.log("inside connection.ReceivedMessage: " + message.message);
			});
		};
	The handler for Connect button should simply call start() on the connection object created above

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
	Finally, to send the message you need to call connection.invoke("<Name of the method handler in server">)

		async function sendMessage() {
			var message = document.getElementById("message").value;
			console.log("sending message: " + message);
			connection.invoke("SendMessageToAll", message);
		};

	You ofcourse need to bring in the signalR JS library, for which we use NPM
		pthapliy@HAW-PTHAPLIY-01 MINGW64 /c/Temp/Apps/SignalRDemo/Client
		$ npm init -y

		pthapliy@HAW-PTHAPLIY-01 MINGW64 /c/Temp/Apps/SignalRDemo/Client
		$ npm install @microsoft/signalr

		pthapliy@HAW-PTHAPLIY-01 MINGW64 /c/Temp/Apps/SignalRDemo/Client
		$ ls
		node_modules/  package-lock.json  package.json

		pthapliy@HAW-PTHAPLIY-01 MINGW64 /c/Temp/Apps/SignalRDemo/Client
		$ cp node_modules/\@microsoft/signalr/dist/browser/signalr.js lib/signalr/

Step 3: Configure nginx
	In your client folder, create a file called nginx.conf

	This is how your client directory looks like
		pthapliy@HAW-PTHAPLIY-01 MINGW64 /c/Temp/Apps/SignalRDemo/Client
		$ ls -slt
		total 33
		4 -rw-r--r-- 1 pthapliy 1049089  636 Aug 18 18:00 index.html
		4 -rw-r--r-- 1 pthapliy 1049089  725 Aug 18 16:45 nginx.conf
		0 drwxr-xr-x 1 pthapliy 1049089    0 Aug 18 13:43 wwwroot/
		0 drwxr-xr-x 1 pthapliy 1049089    0 Aug 18 13:36 logs/
		4 drwxr-xr-x 1 pthapliy 1049089    0 Aug 18 13:36 temp/
		0 drwxr-xr-x 1 pthapliy 1049089    0 Aug 17 19:36 js/
		0 drwxr-xr-x 1 pthapliy 1049089    0 Aug 17 19:33 lib/
		8 -rw-r--r-- 1 pthapliy 1049089 4814 Aug 17 19:24 package-lock.json
		1 -rw-r--r-- 1 pthapliy 1049089  280 Aug 17 19:24 package.json
		4 drwxr-xr-x 1 pthapliy 1049089    0 Aug 17 19:24 node_modules/
		8 -rw-r--r-- 1 pthapliy 1049089 5328 Sep 17  2020 mime.types

	This is how you run nginx
		pthapliy@HAW-PTHAPLIY-01 MINGW64 /c/Temp/Apps/SignalRDemo/Client
		$ /c/Prasun/Software/NGINX/nginx-1.15.6/nginx.exe -p "/c/Temp/apps/SignalRDemo/Client/" -c "nginx.conf"

	On the browser, go to http://localhost
	
	Here is how my nginx.conf looks like
		events {
			worker_connections 768;
			# multi_accept on;
		}

		http {
			include mime.types;
			  server {
				listen 80;
				server_name localhost;
				charset utf-8;

				location / {
					root "/Temp/Apps/SignalRDemo/Client";
				}
				
				location /messages {
					proxy_pass http://localhost:2612;
					proxy_http_version 1.1;
					proxy_set_header Upgrade $http_upgrade;
					proxy_set_header Connection "upgrade";
					# proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
					# proxy_set_header   X-Forwarded-Host $server_name;
				}
				
				location ~ /.css {
					add_header  Content-Type    text/css;
				}
				
				location ~ /.js {
					add_header  Content-Type    application/x-javascript;
				}
				
			}
			
		}

	
----------------------------------------------------------
Troubleshooting:
	(#) Configuring nginx took a few iterations, at the end I realized that multiple nginx versions were running, so killed all from Task Manager
	(#) Unexpected error in initConnection
		Fix: Disable Chrome auto-redirect to https -> Go to some settings and delete something for localhost only (Google it)
	(#) CORS error on browser
		Turned out that even the SignalR server I created was redirecting to HTTPS, so just preventing the redirection at browser wasn't enough
		Comment out auto redirection in Startup.cs
	(#) As a practice, whenever you stop nginx using Ctrl+C, also kill any nginx processes still running using the Task Manager
	
Tips:
	(#) When you call connection.start(), it does this:
	Makes a regular HTTP POST call
		POST http://localhost/messages/negotiate?negotiateVersion=1
		It returns a connection Id and Key
	Using this, a next call is made: A WS GET: ws://localhost/messages?id=Dv_413BjIEGQ3XNYl3t-fA
	If you see in Firefox (also in chrome), the protocol is not HTTP but Websocket, and its state keeps showing Pending
	In firefox, you can also examine the TCP traffic under 'Response'
		The client first sends a json message
			{"protocol":"json","version":1}
		Gets response which is empty
		Then it keeps sending Ping on this channel (and gets response for each ping) (type	"Ping")
			{"type":6}
		When you send a message to the server using connection.invoke(), the following packet is sent (type	"Invocation")
			{"arguments":["test message"],"invocationId":"0","target":"SendMessageToAll","type":1}
		You could receive a message
			{"type":1,"target":"ReceivedMessage","arguments":[{"message":"test"}]}
		Followed by (type	"Completion")
			{"type":3,"invocationId":"0","result":null}

Unexplained:
	(#) When sending a Websocket message from server to client, the syntax in the latest core library is an array of objects.
		However, on the client, its just 1 object.
		I tried by sending 3 objects but UI received only the first one .. Am I not using a compatible/latest library on the UI ?

            await Clients.All.SendCoreAsync("ReceivedMessage", 
                new MessagePoco[] 
                {
                    new MessagePoco { Message = "Filler 01" },
                    new MessagePoco { Message = "Filler 02" },
                    new MessagePoco { Message = message }
                });

==========================================================
22 Aug 2022
-----------
Step 4: Setup Nginx to handle SSL for HTTP and Websocket connections
	ref: (****) Create a Self-Signed Certificate for Nginx in 5 Minutes
		https://www.humankode.com/ssl/create-a-selfsigned-certificate-for-nginx-in-5-minutes/
		
		I logged into onxv1338 and followed the steps here to create a localhost.crt and localhost.key file.
		Then downloaded these files to Windows and placed them in the C:\Temp\Apps\SignalRDemo\Client folder
		
			(#) ssh root@onxv1338.ott.ciena.com
			(#) cd /etc/ssl/certs
				[root@onxv1338 certs]# ls
				ca-bundle.crt  ca-bundle.trust.crt  make-dummy-cert  Makefile  renew-dummy-cert
				[root@onxv1338 certs]# vi localhost.conf
				[root@onxv1338 certs]# cat localhost.conf
				[req]
				default_bits       = 2048
				default_keyfile    = localhost.key
				distinguished_name = req_distinguished_name
				req_extensions     = req_ext
				x509_extensions    = v3_ca

				[req_distinguished_name]
				countryName                 = US
				countryName_default         = US
				stateOrProvinceName         = New York
				stateOrProvinceName_default = New York
				localityName                = Rochester
				localityName_default        = Rochester
				organizationName            = localhost
				organizationName_default    = localhost
				organizationalUnitName      = Development
				organizationalUnitName_default = Development
				commonName                  = localhost
				commonName_default          = localhost
				commonName_max              = 64

				[req_ext]
				subjectAltName = @alt_names

				[v3_ca]
				subjectAltName = @alt_names

				[alt_names]
				DNS.1   = localhost
				DNS.2   = 127.0.0.1
				[root@onxv1338 certs]# 
				[root@onxv1338 certs]# vi ReadMe.txt
				[root@onxv1338 certs]# ls
				ca-bundle.crt  ca-bundle.trust.crt  localhost.conf  make-dummy-cert  Makefile  ReadMe.txt  renew-dummy-cert
				[root@onxv1338 certs]# sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout localhost.key -out localhost.crt -config localhost.conf
				Generating a 2048 bit RSA private key
				..........................+++
				............................................................................................................................+++
				writing new private key to 'localhost.key'
				-----
				You are about to be asked to enter information that will be incorporated
				into your certificate request.
				What you are about to enter is what is called a Distinguished Name or a DN.
				There are quite a few fields but you can leave some blank
				For some fields there will be a default value,
				If you enter '.', the field will be left blank.
				-----
				US [US]:
				New York [New York]:
				Rochester [Rochester]:
				localhost [localhost]:
				Development [Development]:
				localhost [localhost]:
				[root@onxv1338 certs]# ls
				ca-bundle.crt  ca-bundle.trust.crt  localhost.conf  localhost.crt  localhost.key  make-dummy-cert  Makefile  ReadMe.txt  renew-dummy-cert

			Back on the Windows Machine
			pthapliy@HAW-PTHAPLIY-01 MINGW64 ~
			$ scp root@onxv1338.ott.ciena.com:/etc/ssl/certs/local* ./
			root@onxv1338.ott.ciena.com's password:
			localhost.conf                                                                                                                                                                                    100%  826     2.7KB/s   00:00
			localhost.crt                                                                                                                                                                                     100% 1289     3.8KB/s   00:00
			localhost.key                                                                                                                                                                                     100% 1708     4.2KB/s   00:00

			pthapliy@HAW-PTHAPLIY-01 MINGW64 ~
			$ cp localhost.* /c/Temp/apps/SignalRDemo/Client/
			index.html         js/                lib/               logs/              mime.types         nginx.conf         node_modules/      package-lock.json  package.json       temp/

		Finally, set the CRT in nginx.conf
			http {
				include mime.types;
				  server {
					# listen 80;
					
					listen 443 ssl;
					ssl_certificate /Temp/Apps/SignalRDemo/Client/localhost.crt;
					ssl_certificate_key /Temp/Apps/SignalRDemo/Client/localhost.key;
					
					server_name localhost;
					charset utf-8;

					location / {
						root "/Temp/Apps/SignalRDemo/Client";
					}
					
					location /weatherforecast {
						proxy_pass https://localhost:2613/weatherforecast;
					}
							
					location /messages {
						proxy_pass http://localhost:2612;

Step 5: Test and Run Nginx
	$ /c/Prasun/Software/NGINX/nginx-1.15.6/nginx.exe -p "/c/Temp/apps/SignalRDemo/Client/" -c "nginx.conf" -T
	$ /c/Prasun/Software/NGINX/nginx-1.15.6/nginx.exe -p "/c/Temp/apps/SignalRDemo/Client/" -c "nginx.conf"
	
	Run the SignalR server using Visual Studio
Step 6:
	On Google Chrome: https://localhost
		A warning is persented .. type "thisisunsafe"
	On Firefox: https://localhost
		A Warning is presented with button to proceed with the warning
	The default HTML is served both on Google Chrom and Firefox
	
	Go to https://localhost/weatherforecast
		Verify that it works
	Go to https://localhost on both Chrome and Firefox and then 'Init' and 'Start' buttons
		Verify that 'negotiate' is on HTTPS and it worked, Verify that 'messages' is on WSS and it worked
			POST	https://localhost/messages/negotiate?negotiateVersion=1
			GET wss://localhost/messages?id=yCFcgQky72S2j-SO2m07uw
				On Firefox it shows Address	127.0.0.1:443
	Try sending messages and verify that its reaching both the clients
	At this point we are 'almost' done .. My connection from Browser to Nginx is HTTPS and WSS
	From Nginx to Dotnet app, it is HTTPS and WS .. duh !!
	I forgot to update nginx port for '/messages' and it is still 2612 (insecure) and not 2613 (secure)
	Next step would be to update nginx.conf one more time and then try again
		From HAProxy point of view in PlannerPlus, not sure if this would be required, since the NBI published is anyways in-secure

	Well, it worked .. 
		modified
						location /messages {
						proxy_pass http://localhost:2612;
		to
						location /messages {
						proxy_pass https://localhost:2613;
==========================================================

