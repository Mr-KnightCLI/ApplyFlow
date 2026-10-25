package com.applyflow.application;

import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(ApplicationNotFoundException.class) @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiError notFound(ApplicationNotFoundException exception) {
        return error(404, "Not found", exception.getMessage(), Map.of());
    }

    @ExceptionHandler(InvalidApplicationException.class) @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiError invalid(InvalidApplicationException exception) {
        return error(400, "Validation failed", exception.getMessage(), Map.of(exception.getField(), exception.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class) @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiError validation(MethodArgumentNotValidException exception) {
        Map<String, String> fields = new LinkedHashMap<>();
        exception.getBindingResult().getFieldErrors().forEach(e -> fields.putIfAbsent(e.getField(), e.getDefaultMessage()));
        return error(400, "Validation failed", "Check the highlighted fields and try again", fields);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class) @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiError unreadable(HttpMessageNotReadableException exception) {
        return error(400, "Invalid request", "Check the date and status values, then try again", Map.of());
    }

    private ApiError error(int status, String type, String message, Map<String, String> fields) {
        return new ApiError(Instant.now(), status, type, message, fields);
    }
}
