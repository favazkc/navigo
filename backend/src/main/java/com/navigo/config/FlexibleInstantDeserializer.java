package com.navigo.config;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.deser.std.StdDeserializer;

import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

/**
 * Accepts both full ISO-8601 instants ("2026-09-15T00:00:00Z")
 * and date-only strings ("2026-09-15") sent by the frontend.
 */
public class FlexibleInstantDeserializer extends StdDeserializer<Instant> {

    public FlexibleInstantDeserializer() {
        super(Instant.class);
    }

    @Override
    public Instant deserialize(JsonParser p, DeserializationContext ctx) throws IOException {
        String value = p.getText().trim();
        if (value.isEmpty()) return null;
        // date-only: "2026-09-15"
        if (value.length() == 10) {
            return LocalDate.parse(value).atStartOfDay(ZoneOffset.UTC).toInstant();
        }
        // full instant: "2026-09-15T00:00:00Z" etc.
        return Instant.parse(value);
    }
}
