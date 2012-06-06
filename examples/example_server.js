var express = require('express'),
    app = express.createServer(),
    staticDir = __dirname + '/../';

app.use(express.static(staticDir));
app.use(express.static(__dirname));

app.listen(8080);
console.log("Started test server at port: %d in %s mode", app.address().port, app.settings.env);
