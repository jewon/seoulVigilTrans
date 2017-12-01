var http = require('http');
var fs = require('fs');
http.createServer(function(req, res){
	res.writeHead(200, {'Content-Type' : 'text/html'});
	res.write("Hello Node.js");
	res.end();
}).listen(4000, function(){
	console.log("server is listening on 8090");
})