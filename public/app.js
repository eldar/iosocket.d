function showMessage(message)
{
  var li = document.createElement("li");
  li.innerHTML = message;
  
  var output = document.getElementById("output-list");
  output.appendChild(li);
}

function init() {
  var socket = IoSocket.connect("/socketio");
  socket.on("connect", function(event) {

    document.getElementById("send").onclick = function() {
      var msg = document.getElementById("messagefield").value;
      socket.send({"message": msg});
      showMessage(msg);
    };
  });

  socket.on("message", function(data) {
    showMessage(data.message);
  });
}

window.addEventListener("load", init, false);