[![banner](https://raw.githubusercontent.com/nevermined-io/assets/main/images/logo/banner_logo.png)](https://nevermined.io)

# Video Generation MCP Server

An MCP (Model Context Protocol) server that provides AI-powered image and video generation tools, integrated with Nevermined's payment system for credit management and authentication.

## Project Structure

```
src/
├── services/
│   ├── nevermined/
│   │   ├── config.ts       # Nevermined configuration and constants
│   │   ├── manager.ts      # Payment and service access management
│   │   └── index.ts        # Public module exports
│   └── video/
│       ├── service.ts      # Generation service implementation
│       └── index.ts        # Public module exports
└── index.ts               # Entry point and tools definition
```

## Available Tools

This MCP server provides several tools for media generation:

### Step 1: Purchase Plan
Before generating any media, ensure you have enough credits by purchasing a plan:

```json
{
  "name": "purchase_plan",
  "parameters": {
    "planDid": "string" // The DID of the plan to purchase
  }
}
```

### Step 2: Media Generation
Once you have credits, you can use any of these generation tools:

#### Text to Image
Generate images from textual descriptions:
```json
{
  "name": "text2image",
  "parameters": {
    "prompt": "string" // Textual description of the desired image
  }
}
```

#### Image to Image
Transform existing images based on text prompts:
```json
{
  "name": "image2image",
  "parameters": {
    "inputImageUrl": "string", // URL of the image to transform
    "prompt": "string"         // Textual description of the desired transformation
  }
}
```

#### Text to Video
Generate videos from text descriptions:
```json
{
  "name": "text2video",
  "parameters": {
    "prompt": "string",     // Textual description of the desired video
    "imageUrls": "string[]", // Optional: Reference image URLs
    "duration": "number"     // Optional: Video duration in seconds
  }
}
```

## Features

- Nevermined payment system integration
- Credit balance verification before media generation
- Large content handling (>1MB) with URL fallback
- Automatic base64 content conversion for direct display
- Detailed error handling and logging
- Payment management through singleton pattern
- Access token authentication

## Configuration

The server requires only one environment variable:

```env
NVM_API_KEY=your_api_key
```

Other configuration values (environment, plan DID, agent DID) are hardcoded in `config.ts`.

## Installation

```bash
npm install
npm run build
```

## Usage

This is an MCP server that needs to be configured in your MCP client configuration. The setup varies depending on your client:

### Claude Desktop
Add this configuration to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "image-video-generator": {
    "command": "node",
    "args": [
      "/path/to/video-generation-mcp/build/index.js"
    ],
    "env": {
      "NVM_API_KEY": "YOUR_NVM_API_KEY"
    }
  }
}
```

### Other MCP Clients
For other MCP clients like Cursor, refer to their specific documentation for adding custom MCP servers.

## Limitations

- Media content larger than 1MB will be served as URL only
- Images are returned in JPEG format
- Videos are returned in MP4 format
- Base64 content is limited to 1MB to ensure compatibility with MCP protocol

## Development

To contribute to the project:

1. Clone the repository
2. Install dependencies: `npm install`
3. Build the project: `npm run build`
4. Configure in your MCP client as described in the Usage section

License
-------

```
Copyright 2025 Nevermined AG

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License. 