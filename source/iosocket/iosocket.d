module iosocket.iosocket;

import vibe.core.core;
import vibe.core.log;
import vibe.data.json;
import vibe.http.server;
import vibe.http.websockets;
import vibe.core.signal;

import std.array;

private bool isUndef(Json obj)
{
    return obj.type == Json.Type.Undefined;
}

class IoSocket
{
    alias void delegate(Json data) Handler;

    void send(Json data)
    {
        m_data = data;
        m_signal.emit();
    }

    void broadcast(Json data)
    {
        foreach(ios, _; m_transport.ioSockets)
        {
            if(ios !is this)
                ios.addData(data);
        }
        m_transport.m_signal.emit();
    }

    void onMessage(Handler dg)
    {
        m_onMessage ~= dg;
    }

private:

    IoSocketManager m_transport;
    WebSocket m_websocket;
    Signal m_signal;
    Json m_data;
    Handler[] m_onMessage;

    this(IoSocketManager transport, WebSocket ws)
    {
        m_transport = transport;
        m_websocket = ws;
        m_signal = createSignal();
        m_signal.acquire();
    }

    void addData(Json data)
    {
        m_data = data;
    }

    void cleanup()
    {
        m_signal.release();
    }
}

class IoSocketManager
{
    alias void delegate(IoSocket socket) Handler;

    private {
        Signal m_signal;
        bool[IoSocket] ioSockets;
        Handler m_onConnect;
    }

    this() {
        m_signal = createSignal();
    }

    void handleRequest(HttpServerRequest req, HttpServerResponse res)
    {
        auto callback = handleWebSockets( (socket) {
            auto ioSocket = new IoSocket(this, socket);
            ioSockets[ioSocket] = true;

            m_signal.acquire();

            if(m_onConnect !is null)
                m_onConnect(ioSocket);

            while( socket.connected )
            {
                if( socket.dataAvailableForRead() )
                {
                    auto str = cast(string) socket.receive();
                    foreach(dg; ioSocket.m_onMessage)
                        dg(parseJson(str));
                }

                if(!isUndef(ioSocket.m_data))
                {
                    auto dst = appender!string();
                    toJson(dst, ioSocket.m_data);
                    socket.send(cast(ubyte[])dst.data);
                    ioSocket.m_data = Json.Undefined;
                }
                
                rawYield();
            }
            m_signal.release();
            ioSockets.remove(ioSocket);
            ioSocket.cleanup();
        });

        callback(req, res);
    }

    void onConnection(Handler handler)
    {
        m_onConnect = handler;
    }
}