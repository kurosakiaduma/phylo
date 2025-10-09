# Family Tree API Documentation

## Viewing the Documentation

### Online (Swagger UI)

Open `api-docs.html` in your web browser to view interactive API documentation.

### VS Code

Install the "OpenAPI (Swagger) Editor" extension and open `openapi.yaml`.

### Command Line

```bash
# View as JSON
cat openapi.json | jq

# View as YAML
cat openapi.yaml
```

## Files

- `openapi.json` - OpenAPI specification in JSON format
- `openapi.yaml` - OpenAPI specification in YAML format
- `api-docs.html` - Interactive Swagger UI documentation
- `postman_collection.json` - Postman collection for manual testing

## Usage

### Import into Postman

1. Open Postman
2. Click "Import"
3. Select `postman_collection.json`
4. Collection will appear in your sidebar

### Generate Client SDKs

Use OpenAPI Generator to create client libraries:

```bash
# Python client
openapi-generator-cli generate -i openapi.yaml -g python -o ./client-python

# TypeScript client
openapi-generator-cli generate -i openapi.yaml -g typescript-fetch -o ./client-typescript

# Java client
openapi-generator-cli generate -i openapi.yaml -g java -o ./client-java
```

## Authentication

All protected endpoints require Bearer authentication:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

Get a token:
1. Request OTP: `POST /api/auth/otp/request`
2. Verify OTP: `POST /api/auth/otp/verify`
3. Use returned `access_token`

## Base URLs

- Development: http://localhost:8000
- Production: https://api.yourfamilytree.com

## Support

For API support, contact: support@yourfamilytree.com
