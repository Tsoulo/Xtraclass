#!/usr/bin/env node

/**
 * MCP Server Launcher Script
 * 
 * This script starts the Educational AI MCP Server as a standalone process.
 * It can be used by MCP clients like Claude Desktop or other AI applications.
 */

const { spawn } = require('child_process');
const path = require('path');

// Path to the compiled MCP wrapper
const mcpServerPath = path.join(__dirname, '..', 'server', 'mcp-wrapper.js');

console.log('🚀 Starting Educational AI MCP Server...');
console.log(`📍 Server path: ${mcpServerPath}`);

// Start the MCP server
const serverProcess = spawn('node', [mcpServerPath], {
  stdio: 'inherit',
  env: process.env
});

serverProcess.on('error', (error) => {
  console.error('❌ Failed to start MCP server:', error);
  process.exit(1);
});

serverProcess.on('exit', (code) => {
  console.log(`🔚 MCP server exited with code: ${code}`);
  process.exit(code);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down MCP server...');
  serverProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down MCP server...');
  serverProcess.kill('SIGTERM');
});