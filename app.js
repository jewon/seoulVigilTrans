const http = require('http');
const fs = require('fs');

const port = 4000;

http.createServer(function(req, res){
	fs.readFile('index.html', function(err, data){
		res.writeHead(200, { 'Content-Type': 'text/html' });
		res.end(data);
	})
}).listen(port, function(){
	console.log("server is listening on", port);
})
