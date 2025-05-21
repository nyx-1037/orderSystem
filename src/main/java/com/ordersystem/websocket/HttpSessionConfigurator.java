package com.ordersystem.websocket;

import javax.servlet.http.HttpSession;
import javax.websocket.HandshakeResponse;
import javax.websocket.server.HandshakeRequest;
import javax.websocket.server.ServerEndpointConfig;

/**
 * WebSocket握手配置器
 * 用于在WebSocket连接中获取HTTP会话信息
 */
public class HttpSessionConfigurator extends ServerEndpointConfig.Configurator {

    @Override
    public void modifyHandshake(ServerEndpointConfig sec, HandshakeRequest request, HandshakeResponse response) {
        HttpSession httpSession = (HttpSession) request.getHttpSession();
        if (httpSession != null) {
            // 将HttpSession存储在ServerEndpointConfig的用户属性中
            sec.getUserProperties().put(HttpSession.class.getName(), httpSession);
        }
    }
}