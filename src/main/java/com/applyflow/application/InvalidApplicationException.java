package com.applyflow.application;

public class InvalidApplicationException extends RuntimeException {
    private final String field;
    public InvalidApplicationException(String field, String message) { super(message); this.field = field; }
    public String getField() { return field; }
}
