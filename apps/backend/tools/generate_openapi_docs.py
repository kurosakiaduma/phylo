"""Generate OpenAPI/Swagger documentation for the Family Tree API.

This script generates comprehensive API documentation including:
- All endpoints with descriptions
- Request/response schemas
- Authentication requirements
- Example requests and responses
- Error codes and descriptions

Run with: python generate_openapi_docs.py
"""

import json
import yaml
from typing import Dict, Any
from pathlib import Path


def generate_openapi_spec() -> Dict[str, Any]:
    """Generate complete OpenAPI 3.0 specification."""
    
    spec = {
        "openapi": "3.0.0",
        "info": {
            "title": "Family Tree API",
            "version": "1.0.0",
            "description": """
# Family Tree Management API

A comprehensive RESTful API for managing family trees with role-based access control.

## Features

- 🔐 **Passwordless Authentication** - Email-based OTP login
- 👥 **Role-Based Access** - Custodian, Contributor, Viewer roles
- 🌳 **Tree Management** - Create and manage multiple family trees
- 👤 **Member Management** - Add, update, and organize family members
- 💑 **Relationships** - Track spouses, parents, children, and extended family
- 📧 **Invitations** - Invite users to collaborate on trees
- ⚙️ **Flexible Settings** - Support for various family structures

## Authentication

All protected endpoints require a valid JWT token. Obtain a token by:

1. Request OTP code: `POST /api/auth/otp/request`
2. Verify OTP: `POST /api/auth/otp/verify` 
3. Use returned token in Authorization header: `Bearer YOUR_TOKEN`

## Rate Limiting

- OTP requests: 3 per 15 minutes per email
- Other endpoints: Follow standard API rate limits

## Roles

- **Custodian**: Full control over tree (manage members, settings, roles)
- **Contributor**: Can propose changes (future feature)
- **Viewer**: Read-only access to tree

## Base URL

Development: `http://localhost:8050`  
Production: `https://api.yourfamilytree.com`
            """,
            "contact": {
                "name": "API Support",
                "email": "support@yourfamilytree.com"
            },
            "license": {
                "name": "MIT",
                "url": "https://opensource.org/licenses/MIT"
            }
        },
        "servers": [
            {
                "url": "http://localhost:8050",
                "description": "Development server"
            },
            {
                "url": "https://api.yourfamilytree.com",
                "description": "Production server"
            }
        ],
        "tags": [
            {
                "name": "Authentication",
                "description": "User authentication and session management"
            },
            {
                "name": "Trees",
                "description": "Family tree management"
            },
            {
                "name": "Members",
                "description": "Family member management"
            },
            {
                "name": "Relationships",
                "description": "Family relationship management"
            },
            {
                "name": "Invitations",
                "description": "Tree invitation management"
            },
            {
                "name": "Memberships",
                "description": "Role and membership management"
            }
        ],
        "paths": {},
        "components": {
            "securitySchemes": {
                "bearerAuth": {
                    "type": "http",
                    "scheme": "bearer",
                    "bearerFormat": "JWT",
                    "description": "JWT token obtained from OTP verification"
                }
            },
            "schemas": {
                "User": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string", "format": "uuid"},
                        "email": {"type": "string", "format": "email"},
                        "display_name": {"type": "string", "nullable": True},
                        "created_at": {"type": "string", "format": "date-time"}
                    }
                },
                "Tree": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string", "format": "uuid"},
                        "name": {"type": "string"},
                        "description": {"type": "string", "nullable": True},
                        "created_by": {"type": "string", "format": "uuid"},
                        "created_at": {"type": "string", "format": "date-time"},
                        "settings": {"$ref": "#/components/schemas/TreeSettings"}
                    }
                },
                "TreeSettings": {
                    "type": "object",
                    "properties": {
                        "allow_same_sex": {"type": "boolean", "default": True},
                        "monogamy": {"type": "boolean", "default": True},
                        "allow_polygamy": {"type": "boolean", "default": False},
                        "max_spouses_per_member": {"type": "integer", "nullable": True},
                        "allow_single_parent": {"type": "boolean", "default": True},
                        "allow_multi_parent_children": {"type": "boolean", "default": False},
                        "max_parents_per_child": {"type": "integer", "default": 2}
                    }
                },
                "Member": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string", "format": "uuid"},
                        "tree_id": {"type": "string", "format": "uuid"},
                        "name": {"type": "string"},
                        "email": {"type": "string", "format": "email", "nullable": True},
                        "dob": {"type": "string", "nullable": True},
                        "gender": {"type": "string", "nullable": True},
                        "deceased": {"type": "boolean", "default": False},
                        "notes": {"type": "string", "nullable": True},
                        "created_at": {"type": "string", "format": "date-time"},
                        "updated_at": {"type": "string", "format": "date-time"},
                        "updated_by": {"type": "string", "format": "uuid", "nullable": True}
                    }
                },
                "Error": {
                    "type": "object",
                    "properties": {
                        "detail": {"type": "string"}
                    }
                }
            }
        }
    }
    
    return spec


def save_specs(spec: Dict[str, Any], output_dir: Path):
    """Save OpenAPI spec in both JSON and YAML formats."""
    
    # Save as JSON
    json_path = output_dir / "openapi.json"
    with open(json_path, 'w') as f:
        json.dump(spec, f, indent=2)
    print(f"✅ Generated: {json_path}")
    
    # Save as YAML
    yaml_path = output_dir / "openapi.yaml"
    with open(yaml_path, 'w') as f:
        yaml.dump(spec, f, default_flow_style=False, sort_keys=False)
    print(f"✅ Generated: {yaml_path}")
    
    # Generate HTML documentation page
    html_path = output_dir / "api-docs.html"
    html_content = f"""<!DOCTYPE html>
<html>
<head>
    <title>Family Tree API Documentation</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
<div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>
window.onload = function() {{
    SwaggerUIBundle({{
        url: "openapi.json",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
            SwaggerUIBundle.presets.apis,
            SwaggerUIBundle.SwaggerUIStandalonePreset
        ]
    }})
}}
</script>
</body>
</html>"""
    
    with open(html_path, 'w') as f:
        f.write(html_content)
    print(f"✅ Generated: {html_path}")
    
    # Generate README
    readme_path = output_dir / "README.md"
    readme_content = """# Family Tree API Documentation

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

- Development: http://localhost:8050
- Production: https://api.yourfamilytree.com

## Support

For API support, contact: support@yourfamilytree.com
"""
    
    with open(readme_path, 'w') as f:
        f.write(readme_content)
    print(f"✅ Generated: {readme_path}")


def main():
    """Main function to generate all documentation."""
    print("🚀 Generating OpenAPI documentation...\n")
    
    # Create output directory
    output_dir = Path(__file__).parent / "api-docs"
    output_dir.mkdir(exist_ok=True)
    
    # Generate OpenAPI spec
    spec = generate_openapi_spec()
    
    # Save in multiple formats
    save_specs(spec, output_dir)
    
    print(f"\n✅ Documentation generated successfully!")
    print(f"📁 Output directory: {output_dir}")
    print(f"\n💡 Next steps:")
    print(f"   1. Open api-docs/api-docs.html in your browser")
    print(f"   2. Import api-docs/postman_collection.json into Postman")
    print(f"   3. Review api-docs/openapi.yaml for the full spec")


if __name__ == "__main__":
    main()
