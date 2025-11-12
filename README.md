# Contentstack CLI Plugin - OpenAPI Generator

[![npm version](https://img.shields.io/npm/v/@contentstack/cli-plugin-openapi.svg)](https://www.npmjs.com/package/@contentstack/cli-plugin-openapi)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Generate **OpenAPI 3.1** JSON specifications for your Contentstack stacks. This plugin automatically introspects your stack's content types and generates comprehensive, ready-to-use API specifications for either the **Content Delivery API (CDA)** or **Content Management API (CMA)**.

## ✨ Features

- 🎯 **Automatic Schema Generation** - Generates JSON Schemas for all content types and global fields
- 🔄 **Dual API Support** - Generate specs for both Delivery API (read-only) and Management API (full CRUD)
- 🌍 **Multi-Region Support** - Automatically uses correct endpoints based on your Contentstack region
- 📋 **OpenAPI 3.1 Compliant** - Generates valid, validated specifications ready for code generation
- 🔐 **Proper Security Schemes** - Includes correct authentication requirements for each API mode
- 🧩 **Modular Blocks Support** - Correctly handles Contentstack modular blocks as arrays of unions
- 📝 **Shared Parameters** - DRY parameter definitions for common query parameters
- ✅ **Validated Output** - Automatically validates the generated spec before writing

## 📋 Prerequisites

- **Node.js** >= 20.0.0
- **Contentstack CLI** installed and configured
- **Management Token Alias** configured in your CLI

### Setup

1. **Install Contentstack CLI** (if not already installed):

   ```bash
   npm install -g @contentstack/cli
   ```

2. **Configure your management token alias**:

   ```bash
   # The plugin requires a token alias to authenticate with the Management API
   # Ensure you have a management token alias configured in your CLI
   ```

3. **Configure your region** (optional, defaults to CLI config):
   ```bash
   csdx config:set:region us  # or eu, azure-na, azure-eu, gcp-na, gcp-eu, au
   ```

## 🚀 Installation

### Install from npm

```bash
csdx plugins:install @contentstack/cli-plugin-openapi
```

### Local Development

```bash
# Clone the repository
git clone https://github.com/contentstack/contentstack-cli-plugin-openapi.git
cd contentstack-cli-plugin-openapi

# Install dependencies
npm install

# Build the project
npm run build

# Link the plugin locally
csdx plugins:link .
```

## 💻 Usage

### Basic Usage

Generate an OpenAPI specification for the Delivery API:

```bash
csdx openapi:generate -s <stack-api-key> --token-alias <management-token-alias>
```

### Common Examples

#### Generate Delivery API Spec

```bash
csdx openapi:generate \
  -s blt1234567890abcdef \
  -t my-management-token-alias \
  -e production \
  --title "MyStack Delivery API" \
  -o ./openapi.json
```

#### Generate Management API Spec

```bash
csdx openapi:generate \
  -s blt1234567890abcdef \
  -t my-management-token-alias \
  -m management \
  --title "MyStack Management API" \
  --version 1.2.0 \
  -o ./management-api.json
```

#### Specify Region

```bash
csdx openapi:generate \
  -s blt1234567890abcdef \
  -t my-management-token-alias \
  -r eu \
  -o ./openapi-eu.json
```

## 📖 Command Options

| Flag               | Short | Description                                                              | Required | Default            |
| ------------------ | ----- | ------------------------------------------------------------------------ | -------- | ------------------ |
| `--stack`          | `-s`  | Stack API key                                                            | ✅ Yes   | -                  |
| `--token-alias`    | `-t`  | Management token alias                                                   | ✅ Yes   | -                  |
| `--mode`           | `-m`  | API mode: `delivery` or `management`                                     | No       | `delivery`         |
| `--region`         | `-r`  | Contentstack region (na, us, eu, azure-na, azure-eu, gcp-na, gcp-eu, au) | No       | From CLI config    |
| `--env`            | `-e`  | CDA environment name for examples                                        | No       | -                  |
| `--out`            | `-o`  | Output file path                                                         | No       | `openapi.json`     |
| `--format`         | -     | Output format: `json` or `yaml`                                          | No       | `json`             |
| `--title`          | -     | OpenAPI `info.title`                                                     | No       | `<stack-name> API` |
| `--version`        | -     | OpenAPI `info.version`                                                   | No       | `1.0.0`            |
| `--locale`         | -     | Default locale code for examples                                         | No       | -                  |
| `--include-drafts` | -     | Include drafts in CDA query params                                       | No       | `false`            |
| `--servers`        | -     | Comma-separated server URLs (overrides region)                           | No       | Auto-detected      |

## 🎯 API Modes

### Delivery Mode (`--mode delivery`)

Generates a **read-only** API specification for the Content Delivery API:

- ✅ `GET` endpoints only
- ✅ Query parameters for filtering, pagination, and sorting
- ✅ Security: Requires `api_key` and `access_token` headers
- ✅ Use case: Frontend applications, public APIs, read-only integrations

**Example paths:**

- `GET /v3/content_types/{content_type}/entries` - List entries
- `GET /v3/content_types/{content_type}/entries/{uid}` - Get entry
- `GET /v3/assets` - List assets
- `GET /v3/assets/{uid}` - Get asset

### Management Mode (`--mode management`)

Generates a **full CRUD** API specification for the Content Management API:

- ✅ `GET`, `POST`, `PUT`, `DELETE` endpoints
- ✅ Request/response schemas for create/update operations
- ✅ Security: Requires Bearer token authentication
- ✅ Use case: Content management tools, admin panels, migrations

**Example paths:**

- `GET /v3/content_types/{content_type}/entries` - List entries
- `POST /v3/content_types/{content_type}/entries` - Create entry
- `GET /v3/content_types/{content_type}/entries/{uid}` - Get entry
- `PUT /v3/content_types/{content_type}/entries/{uid}` - Update entry
- `DELETE /v3/content_types/{content_type}/entries/{uid}` - Delete entry

## 📊 Generated Output

The plugin generates a complete **OpenAPI 3.1** specification including:

### Schema Generation

- **Content Type Schemas** - Automatically generated from your stack's content types
- **Global Field Schemas** - Reusable field definitions
- **Common Schemas** - `EntryMeta`, `Asset`, `Locale`
- **Modular Blocks** - Properly structured as arrays of `oneOf` unions with discriminators

### Field Type Mapping

| Contentstack Type  | JSON Schema                       | Notes                        |
| ------------------ | --------------------------------- | ---------------------------- |
| `text`, `title`    | `string`                          | -                            |
| `number`           | `number`                          | -                            |
| `boolean`          | `boolean`                         | -                            |
| `date`, `datetime` | `string` with `format: date-time` | Automatic format detection   |
| `file`             | `$ref: Asset`                     | Reference to Asset schema    |
| `link`             | `$ref: Asset` or `array`          | Supports multiple links      |
| `reference`        | `$ref` to content type            | Supports multiple references |
| `group`            | `object`                          | Nested properties            |
| `blocks`           | `array` of `oneOf`                | With discriminator           |
| `json`             | `object`                          | `additionalProperties: true` |

### Security Schemes

**Delivery Mode:**

- `ApiKey` - Header: `api_key`
- `DeliveryTokenAuth` - Header: `access_token`

**Management Mode:**

- `ManagementTokenAuth` - Bearer token: `Authorization: Bearer <token>`

### Server Configuration

Automatically configures servers based on your Contentstack region:

- **NA/US**: `https://cdn.contentstack.io`
- **EU**: `https://eu-cdn.contentstack.com`
- **Azure NA**: `https://azure-na-cdn.contentstack.com`
- **Azure EU**: `https://azure-eu-cdn.contentstack.com`
- **GCP NA**: `https://gcp-na-cdn.contentstack.com`
- **GCP EU**: `https://gcp-eu-cdn.contentstack.com`
- **AU**: `https://au-cdn.contentstack.com`

All available regions are listed as server options in the generated spec.

## 🔧 Use Cases

### 1. API Documentation

Generate interactive API documentation using tools like:

- [Swagger UI](https://swagger.io/tools/swagger-ui/)
- [Redoc](https://redocly.com/)
- [Stoplight Elements](https://stoplight.io/open-source/elements)

### 2. Code Generation

Generate client SDKs using [OpenAPI Generator](https://openapi-generator.tech/):

```bash
# Generate TypeScript client
openapi-generator-cli generate \
  -i openapi.json \
  -g typescript-axios \
  -o ./generated-client

# Generate Java client
openapi-generator-cli generate \
  -i openapi.json \
  -g java \
  -o ./generated-client
```

### 3. API Testing

Use the generated spec with tools like:

- [Postman](https://www.postman.com/) - Import OpenAPI spec
- [Insomnia](https://insomnia.rest/) - Import OpenAPI spec
- [Dredd](https://dredd.org/) - API testing framework

### 4. API Gateway Configuration

Use the spec to configure API gateways like:

- AWS API Gateway
- Kong
- Tyk

## 📝 Example Output

The generated OpenAPI spec includes:

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "MyStack API",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "https://cdn.contentstack.io",
      "description": "AWS North America (na)"
    }
  ],
  "paths": {
    "/v3/content_types/blog_post/entries": {
      "get": {
        "summary": "List Blog Post entries",
        "parameters": [
          { "$ref": "#/components/parameters/Environment" },
          { "$ref": "#/components/parameters/Locale" }
        ],
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "entries": {
                      "type": "array",
                      "items": {
                        "allOf": [
                          { "$ref": "#/components/schemas/BlogPost" },
                          { "$ref": "#/components/schemas/EntryMeta" }
                        ]
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "BlogPost": {
        "type": "object",
        "properties": {
          "title": { "type": "string" },
          "body": { "type": "string" }
        }
      }
    },
    "parameters": {
      "Environment": {
        "name": "environment",
        "in": "query",
        "required": true,
        "schema": { "type": "string" }
      }
    },
    "securitySchemes": {
      "ApiKey": {
        "type": "apiKey",
        "in": "header",
        "name": "api_key"
      },
      "DeliveryTokenAuth": {
        "type": "apiKey",
        "in": "header",
        "name": "access_token"
      }
    }
  },
  "security": [{ "ApiKey": [], "DeliveryTokenAuth": [] }]
}
```

## 🐛 Troubleshooting

### Authentication Error

**Error:** `Management token not found for alias "..."`

**Solution:**

```bash
# Ensure your token alias exists in CLI config
# Check your configured tokens
csdx config:get tokens

# Or set token via environment variable (fallback)
export CS_AUTHTOKEN=your-management-token
```

### Region Not Found

**Error:** `Region ... not found`

**Solution:**

```bash
# Set your region explicitly
csdx openapi:generate -s <api-key> -t <alias> -r eu

# Or configure default region
csdx config:set:region eu
```

### No Content Types Found

**Warning:** `No content types found in this stack`

**Solution:**

- This is normal if your stack is empty
- The plugin will still generate a valid spec with common endpoints (assets, locales)
- Create content types in your stack to generate content-type-specific paths

### Validation Errors

**Error:** OpenAPI validation warnings

**Solution:**

- The plugin validates the spec before writing
- Warnings are logged but don't prevent output
- Check the warning message for specific issues
- The generated spec should still be usable

## 🧪 Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
npm run lint:fix
```

### Project Structure

```
.
├── src/
│   ├── commands/
│   │   └── openapi/
│   │       └── generate.ts      # Main command
│   └── utils/
│       ├── cma-client.ts         # CMA API client
│       ├── openapi-builder.ts    # OpenAPI spec builder
│       ├── path-generator.ts     # Path generation
│       ├── regions.ts            # Region handling
│       └── schema-mapper.ts     # Schema mapping
├── test/                         # Unit tests
├── lib/                          # Compiled output (auto-generated)
└── package.json
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT

## 🔗 Related Resources

- [Contentstack CLI Documentation](https://www.contentstack.com/docs/developers/cli)
- [Contentstack Management API](https://www.contentstack.com/docs/developers/apis/content-management-api)
- [Contentstack Delivery API](https://www.contentstack.com/docs/developers/apis/content-delivery-api)
- [OpenAPI Specification](https://swagger.io/specification/)
- [OpenAPI Generator](https://openapi-generator.tech/)

## 💡 Tips

- **Keep specs updated**: Regenerate your OpenAPI spec when content types change
- **Version control**: Commit generated specs to track API changes over time
- **CI/CD integration**: Add spec generation to your CI/CD pipeline
- **Documentation**: Use the generated spec as the source of truth for API documentation

---

Made with ❤️ by Tim Benniks
