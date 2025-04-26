package com.ordersystem.controller;

import com.ordersystem.entity.User;
import com.ordersystem.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockHttpServletRequest;
import com.ordersystem.service.RedisService;
import com.ordersystem.util.JwtTokenUtil;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest
class UserControllerTest {

    @Mock
    private UserService userService;
    @Mock
    private RedisService redisService;
    @Mock
    private JwtTokenUtil jwtTokenUtil;

    @InjectMocks
    private UserController userController;

    private MockHttpServletRequest request;
    private MockHttpSession session;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        request = new MockHttpServletRequest();
        session = new MockHttpSession();
        when(jwtTokenUtil.generateToken(any(User.class))).thenReturn("mock_token");
    }

    @Test
    void login_Success() {
        User mockUser = new User();
        mockUser.setUsername("admin");
        mockUser.setPassword("123456");

        when(userService.login("admin", "123456")).thenReturn(mockUser);

        ResponseEntity<?> response = userController.login(mockUser, session);
        assertEquals(200, response.getStatusCodeValue());
        Map<String, Object> responseBody = (Map<String, Object>) response.getBody();
        assertEquals("mock_token", responseBody.get("token"));
        assertEquals(mockUser, responseBody.get("user"));
        verify(redisService).setToken(eq(mockUser.getUserId()), eq("mock_token"), eq(86400L));
    }

    @Test
    void login_Failure() {
        when(userService.login("wrong", "wrong")).thenReturn(null);

        User wrongUser = new User();
        wrongUser.setUsername("wrong");
        wrongUser.setPassword("wrong");

        ResponseEntity<?> response = userController.login(wrongUser, session);
        assertEquals(400, response.getStatusCodeValue());
        assertEquals("用户名或密码错误", response.getBody());
        verify(redisService, never()).setToken(any(), any(), anyLong());
    }

    @Test
    void logout_Success() {
        User mockUser = new User();
        mockUser.setUserId(1);
        request.setAttribute("userId", 1);
        
        ResponseEntity<?> response = userController.logout(request);
        assertEquals(200, response.getStatusCodeValue());
        verify(redisService).deleteToken(1);
    }

    @Test
    void getCurrentUser_LoggedIn() {
        User mockUser = new User();
        mockUser.setUserId(1);
        request.setAttribute("userId", 1);
        when(userService.getUserById(1)).thenReturn(mockUser);

        ResponseEntity<?> response = userController.getCurrentUser(request);
        assertEquals(200, response.getStatusCodeValue());
        assertEquals(mockUser, response.getBody());
    }

    @Test
    void getCurrentUser_NotLoggedIn() {
        ResponseEntity<?> response = userController.getCurrentUser(request);
        assertEquals(401, response.getStatusCodeValue());
        assertEquals("未登录", response.getBody());
    }
}