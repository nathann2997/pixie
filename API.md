# Pixie API Documentation

## Overview

This document describes the API endpoint required for Pixie Agent to function in production. Backend developers should implement this endpoint to serve client-specific configurations.

## Configuration Endpoint

### `GET /pixie/config/:clientId`

Returns pixel and event configuration for a specific client.

**URL Parameters:**
- `clientId` (string, required) - Unique identifier for the client

**Response Format:** JSON

**Response Example:**
```json
{
  "pixels": {
    "ga4": "G-XXXXXXXXX",
    "meta": "123456789012345"
  },
  "events": [
    {
      "selector": "#buy-btn",
      "trigger": "click",
      "platform": "ga4",
      "event_name": "purchase",
      "event_data": {
        "currency": "USD",
        "value": 99.99
      }
    },
    {
      "selector": ".signup-form",
      "trigger": "submit",
      "platform": "meta",
      "event_name": "Lead"
    }
  ]
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success - Configuration returned |
| 400 | Bad Request - Invalid client ID format |
| 404 | Not Found - Client ID not found |
| 500 | Internal Server Error |

### Headers

**Request Headers:**
```
Accept: application/json
Origin: https://client-domain.com
```

**Response Headers:**
```
Content-Type: application/json
Cache-Control: public, max-age=300
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET
Access-Control-Allow-Headers: Content-Type
```

---

## Implementation Examples

### Node.js (Express)

```javascript
const express = require('express');
const app = express();

// Database/cache imports
const { getClientConfig } = require('./database');

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Configuration endpoint
app.get('/pixie/config/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;

    // Validate client ID format
    if (!clientId || !/^[a-zA-Z0-9-_]+$/.test(clientId)) {
      return res.status(400).json({
        error: 'Invalid client ID format'
      });
    }

    // Fetch configuration from database
    const config = await getClientConfig(clientId);

    if (!config) {
      return res.status(404).json({
        error: 'Client not found'
      });
    }

    // Cache for 5 minutes
    res.set('Cache-Control', 'public, max-age=300');
    
    res.json(config);
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

app.listen(3000, () => {
  console.log('Pixie API running on port 3000');
});
```

### Python (Flask)

```python
from flask import Flask, jsonify, request
from flask_cors import CORS
import re

app = Flask(__name__)
CORS(app)

# Import your database/cache layer
from database import get_client_config

@app.route('/pixie/config/<client_id>', methods=['GET'])
def get_config(client_id):
    try:
        # Validate client ID format
        if not client_id or not re.match(r'^[a-zA-Z0-9-_]+$', client_id):
            return jsonify({
                'error': 'Invalid client ID format'
            }), 400

        # Fetch configuration
        config = get_client_config(client_id)

        if not config:
            return jsonify({
                'error': 'Client not found'
            }), 404

        # Set cache headers
        response = jsonify(config)
        response.headers['Cache-Control'] = 'public, max-age=300'
        
        return response
    except Exception as e:
        print(f'Error fetching config: {e}')
        return jsonify({
            'error': 'Internal server error'
        }), 500

if __name__ == '__main__':
    app.run(port=3000)
```

### PHP (Laravel)

```php
<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/pixie/config/{clientId}', function ($clientId) {
    try {
        // Validate client ID format
        if (!preg_match('/^[a-zA-Z0-9-_]+$/', $clientId)) {
            return response()->json([
                'error' => 'Invalid client ID format'
            ], 400);
        }

        // Fetch configuration from database
        $config = DB::table('client_configs')
            ->where('client_id', $clientId)
            ->first();

        if (!$config) {
            return response()->json([
                'error' => 'Client not found'
            ], 404);
        }

        // Return with cache headers
        return response()
            ->json(json_decode($config->configuration))
            ->header('Cache-Control', 'public, max-age=300');
            
    } catch (Exception $e) {
        Log::error('Error fetching config: ' . $e->getMessage());
        return response()->json([
            'error' => 'Internal server error'
        ], 500);
    }
});
```

### Go (Gin)

```go
package main

import (
    "net/http"
    "regexp"
    "github.com/gin-gonic/gin"
)

type Config struct {
    Pixels map[string]string `json:"pixels"`
    Events []Event           `json:"events"`
}

type Event struct {
    Selector  string                 `json:"selector"`
    Trigger   string                 `json:"trigger"`
    Platform  string                 `json:"platform"`
    EventName string                 `json:"event_name"`
    EventData map[string]interface{} `json:"event_data,omitempty"`
}

func main() {
    r := gin.Default()

    // CORS middleware
    r.Use(func(c *gin.Context) {
        c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
        c.Writer.Header().Set("Access-Control-Allow-Methods", "GET")
        c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type")
        c.Next()
    })

    r.GET("/pixie/config/:clientId", func(c *gin.Context) {
        clientId := c.Param("clientId")

        // Validate client ID
        matched, _ := regexp.MatchString(`^[a-zA-Z0-9-_]+$`, clientId)
        if !matched {
            c.JSON(http.StatusBadRequest, gin.H{
                "error": "Invalid client ID format",
            })
            return
        }

        // Fetch config from database
        config, err := getClientConfig(clientId)
        if err != nil {
            c.JSON(http.StatusNotFound, gin.H{
                "error": "Client not found",
            })
            return
        }

        // Set cache headers
        c.Header("Cache-Control", "public, max-age=300")
        c.JSON(http.StatusOK, config)
    })

    r.Run(":3000")
}

func getClientConfig(clientId string) (*Config, error) {
    // Implement your database fetch logic here
    return nil, nil
}
```

---

## Database Schema

### Recommended Table Structure

```sql
CREATE TABLE client_configs (
    id SERIAL PRIMARY KEY,
    client_id VARCHAR(255) UNIQUE NOT NULL,
    configuration JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT true
);

CREATE INDEX idx_client_id ON client_configs(client_id);
CREATE INDEX idx_active ON client_configs(active);
```

### Example Data

```sql
INSERT INTO client_configs (client_id, configuration) VALUES
('test-client-123', '{
  "pixels": {
    "ga4": "G-XXXXXXXXX",
    "meta": "123456789012345"
  },
  "events": [
    {
      "selector": "#buy-btn",
      "trigger": "click",
      "platform": "ga4",
      "event_name": "purchase"
    },
    {
      "selector": ".signup-form",
      "trigger": "submit",
      "platform": "meta",
      "event_name": "Lead"
    }
  ]
}');
```

---

## Caching Strategy

### Recommended Approach

1. **CDN Caching**: Cache responses at CDN level for 5-10 minutes
2. **Application Cache**: Use Redis/Memcached for frequently accessed configs
3. **Database**: Primary source of truth

### Example Cache Flow

```
Request → CDN Cache (HIT) → Return
       ↓ (MISS)
       → App Cache (HIT) → Return
       ↓ (MISS)
       → Database → Store in App Cache → Store in CDN → Return
```

### Redis Cache Example (Node.js)

```javascript
const redis = require('redis');
const client = redis.createClient();

async function getClientConfig(clientId) {
  // Try cache first
  const cached = await client.get(`config:${clientId}`);
  if (cached) {
    return JSON.parse(cached);
  }

  // Fetch from database
  const config = await db.query(
    'SELECT configuration FROM client_configs WHERE client_id = $1',
    [clientId]
  );

  if (config.rows.length > 0) {
    const configData = config.rows[0].configuration;
    
    // Cache for 5 minutes
    await client.setEx(
      `config:${clientId}`,
      300,
      JSON.stringify(configData)
    );
    
    return configData;
  }

  return null;
}
```

---

## Security Considerations

### 1. Rate Limiting

Implement rate limiting to prevent abuse:

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100 // 100 requests per minute
});

app.use('/pixie/config', limiter);
```

### 2. Client ID Validation

Always validate client IDs:
- Only alphanumeric, hyphens, and underscores
- Maximum length (e.g., 100 characters)
- Check against database

### 3. CORS Configuration

In production, restrict CORS to known domains:

```javascript
const corsOptions = {
  origin: function (origin, callback) {
    const allowedDomains = await getClientDomains(clientId);
    if (allowedDomains.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
};

app.use(cors(corsOptions));
```

### 4. HTTPS Only

Always serve the API over HTTPS in production:
```javascript
if (process.env.NODE_ENV === 'production' && !req.secure) {
  return res.redirect('https://' + req.headers.host + req.url);
}
```

---

## Testing

### Manual Testing with cURL

```bash
# Test valid client
curl -i https://api.yoursite.com/pixie/config/test-client-123

# Test invalid client
curl -i https://api.yoursite.com/pixie/config/invalid!!!id

# Test non-existent client
curl -i https://api.yoursite.com/pixie/config/does-not-exist
```

### Automated Testing (Jest)

```javascript
describe('Pixie Config API', () => {
  test('returns config for valid client', async () => {
    const response = await request(app)
      .get('/pixie/config/test-client-123')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('pixels');
    expect(response.body).toHaveProperty('events');
  });

  test('returns 400 for invalid client ID', async () => {
    const response = await request(app)
      .get('/pixie/config/invalid!!!id')
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  test('returns 404 for non-existent client', async () => {
    await request(app)
      .get('/pixie/config/does-not-exist')
      .expect(404);
  });

  test('includes cache headers', async () => {
    const response = await request(app)
      .get('/pixie/config/test-client-123');

    expect(response.headers['cache-control']).toContain('max-age');
  });
});
```

---

## Monitoring & Analytics

### Recommended Metrics

1. **Request Volume**: Track requests per client
2. **Response Times**: Monitor API latency
3. **Error Rates**: Track 4xx and 5xx responses
4. **Cache Hit Rate**: Measure cache effectiveness
5. **Client Activity**: Track active vs inactive clients

### Example Logging

```javascript
app.get('/pixie/config/:clientId', async (req, res) => {
  const startTime = Date.now();
  const { clientId } = req.params;

  try {
    const config = await getClientConfig(clientId);
    const duration = Date.now() - startTime;

    // Log metrics
    logger.info('Config fetched', {
      clientId,
      duration,
      cached: config.fromCache,
      timestamp: new Date().toISOString()
    });

    res.json(config);
  } catch (error) {
    logger.error('Config fetch failed', {
      clientId,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

---

## Deployment Checklist

- [ ] Endpoint implemented and tested
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] HTTPS enforced
- [ ] Caching strategy implemented
- [ ] Error handling in place
- [ ] Monitoring/logging configured
- [ ] Load testing completed
- [ ] Security review completed
- [ ] Documentation updated

---

## Support

For questions or issues with the API implementation:
- Review the example implementations above
- Check the configuration schema in `config.example.json`
- Test with the provided cURL commands
- Monitor logs for errors

**API Version:** 1.0.0  
**Last Updated:** 2026-02-16
