var http     = require('http');
var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');
var os = require('os');


var portid = process.env['PORT'] || 8081;
var host = os.hostname() || '0.0.0.0';
// Main entry point.  Creates a connection pool, on callback creates an
// HTTP server and executes a query based on the URL parameter given.
// The pool values shown are the default values.
oracledb.createPool (
  {
    user          : dbConfig.user,
    password      : dbConfig.password,
    connectString : dbConfig.connectString,
    poolMax       : 4, // maximum size of the pool
    poolMin       : 0, // let the pool shrink completely
    poolIncrement : 1, // only grow the pool by one connection at a time
    poolTimeout   : 0  // never terminate idle connections
  },
  function(err, pool)
  {
    if (err) {
      console.error("createPool() callback: " + err.message);
      return;
    }

    // Create HTTP server and listen on port - portid
    hs = http.createServer (
      function(request, response)  // Callback gets HTTP request & response object
      {

        htmlHeader(response,
                   "Oracle Database Driver for Node.js" ,
                   "Example using node-oracledb driver");
				   
		// Checkout a connection from the pool
        pool.getConnection (
          function(err, connection)
          {
            if (err) {
              handleError(response, "getConnection() failed ", err);
              return;
            }

            // console.log("Connections open: " + pool.connectionsOpen);
            // console.log("Connections in use: " + pool.connectionsInUse);

            connection.execute(
              "SELECT TO_CHAR (SYSDATE, 'MM-DD-YYYY HH24:MI:SS') NOW FROM DUAL",
            
              [],  // bind variable value
              function(err, result)
              {
                if (err) {
                  connection.release(
                    function(err)
                    {
                      if (err) {
                        handleError(response, "execute() error release() callback", err);
                        return;
                      }
                    });
                  handleError(response, "execute() callback", err);
                  return;
                }

                displayResults(response, result);

                /* Release the connection back to the connection pool */
                connection.release(
                  function(err)
                  {
                    if (err) {
                      handleError(response, "normal release() callback", err);
                      return;
                    }
                  });

                htmlFooter(response);
              });
          });
      });

    hs.listen(portid, host);

    console.log("Server running at http://"+host+":" + portid);
  });


// Report an error
function handleError(response, text, err)
{
  if (err) {
    text += err.message
  }
  console.error(text);
  response.write("<p>Error: " + text + "</p>");
  htmlFooter(response);
}

// Display query results
function displayResults(response, result)
{
  response.write("<h2>" + "System Date Time " + result.rows + "</h2>");

}


// Prepare HTML header
function htmlHeader(response, title, caption)
{
  response.writeHead (200, {"Content-Type" : "text/html" });
  response.write     ("<!DOCTYPE html>");
  response.write     ("<html>");
  response.write     ("<head>");
  response.write     ("<style>"
                    + "body {background:#FFFFFF;color:#000000;font-family:Arial,sans-serif;margin:40px;padding:10px;font-size:12px;text-align:center;}"
                    + "h1 {margin:0px;margin-bottom:12px;background:#FF0000;text-align:center;color:#FFFFFF;font-size:28px;}"
                    + "table {border-collapse: collapse;   margin-left:auto; margin-right:auto;}"
                    + "td {padding:8px;border-style:solid}"
                    + "</style>\n");
  response.write     ("<title>" + caption + "</title>");
  response.write     ("</head>");
  response.write     ("<body>");
  response.write     ("<h1>" + title + "</h1>");
  response.write("<h4>DBAAS_USER_NAME::</h4><h4>"+ process.env["DBAAS_USER_NAME"] +"</h4>");
  response.write("<h4>DBAAS_USER_PASSWORD::</h4><h4>"+  dbConfig.password +"</h4>");
  response.write("<h4>DBAAS_DEFAULT_CONNECT_DESCRIPTOR::</h4><h4>"+  dbConfig.connectString +"</h4>");
}


// Prepare HTML footer
function htmlFooter(response)
{
  response.write("</body>\n</html>");
  response.end();
}
