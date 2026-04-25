# Create main folder
mkdir prism-automator
cd prism-automator

# Root files
New-Item package.json -ItemType File
New-Item tsconfig.json -ItemType File

# Create src folder
mkdir src
cd src

# Create all TypeScript files
New-Item browserConfig.ts -ItemType File
New-Item BrowserMan.ts -ItemType File
New-Item ChatController.ts -ItemType File
New-Item config.ts -ItemType File
New-Item EventManager.ts -ItemType File
New-Item global.d.ts -ItemType File
New-Item index.ts -ItemType File
New-Item SiteController.ts -ItemType File
New-Item types.ts -ItemType File
New-Item utils.ts -ItemType File