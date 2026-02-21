package com.waad.tba.modules.rbac.controller;

import com.waad.tba.common.dto.ApiResponse;
import com.waad.tba.modules.rbac.dto.UserCreateDto;
import com.waad.tba.modules.rbac.dto.UserResponseDto;
import com.waad.tba.modules.rbac.dto.UserUpdateDto;
import com.waad.tba.modules.rbac.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserController unit tests")
class UserControllerUnitTest {

    @Mock
    private UserService userService;

    private UserController controller;

    @BeforeEach
    void setUp() {
        controller = new UserController(userService);
    }

    @Test
    void createUser_returnsCreated() {
        UserCreateDto dto = new UserCreateDto();
        UserResponseDto created = new UserResponseDto();
        when(userService.create(dto)).thenReturn(created);

        ResponseEntity<ApiResponse<UserResponseDto>> response = controller.createUser(dto);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(created, response.getBody().getData());
        verify(userService).create(dto);
    }

    @Test
    void updateUser_returnsOk() {
        UserUpdateDto dto = new UserUpdateDto();
        UserResponseDto updated = new UserResponseDto();
        when(userService.update(41L, dto)).thenReturn(updated);

        ResponseEntity<ApiResponse<UserResponseDto>> response = controller.updateUser(41L, dto);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(updated, response.getBody().getData());
        verify(userService).update(41L, dto);
    }

    @Test
    void deleteUser_returnsOk() {
        ResponseEntity<ApiResponse<Void>> response = controller.deleteUser(42L);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(userService).delete(42L);
    }

    @Test
    void searchUsers_returnsResults() {
        List<UserResponseDto> users = List.of(new UserResponseDto());
        when(userService.search("omar")).thenReturn(users);

        ResponseEntity<ApiResponse<List<UserResponseDto>>> response = controller.searchUsers("omar");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(users, response.getBody().getData());
        verify(userService).search("omar");
    }
}
