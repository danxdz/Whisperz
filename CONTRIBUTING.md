# Contributing to Whisperz

First off, thank you for considering contributing to Whisperz! It's people like you that make Whisperz such a great tool for the decentralized web.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Style Guidelines](#style-guidelines)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by the [Whisperz Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

Before you begin:
- Have you read the [code of conduct](CODE_OF_CONDUCT.md)?
- Check out the [existing issues](https://github.com/danxdz/Whisperz/issues) & see if we [accept contributions](#types-of-contributions) for your type of issue.

## How Can I Contribute?

### 🐛 Reporting Bugs

Before creating bug reports, please check the existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

**Bug Report Template:**
- **Description**: A clear and concise description of what the bug is
- **Steps to Reproduce**: Steps to reproduce the behavior
- **Expected Behavior**: What you expected to happen
- **Actual Behavior**: What actually happened
- **Screenshots**: If applicable, add screenshots
- **Environment**:
  - OS: [e.g., Windows 10, macOS 12.0, Ubuntu 20.04]
  - Browser: [e.g., Chrome 96, Firefox 95]
  - Node Version: [e.g., 16.13.0]
  - NPM Version: [e.g., 8.1.0]

### 💡 Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

**Enhancement Template:**
- **Description**: A clear and concise description of the enhancement
- **Use Case**: Explain why this enhancement would be useful
- **Possible Implementation**: Describe how it might work
- **Alternatives**: Any alternative solutions or features you've considered

### 🔧 Your First Code Contribution

Unsure where to begin contributing? You can start by looking through these issues:
- Issues labeled `good first issue` - issues which should only require a few lines of code
- Issues labeled `help wanted` - issues which should be a bit more involved than beginner issues

### 📝 Pull Requests

The process described here has several goals:
- Maintain Whisperz's quality
- Fix problems that are important to users
- Engage the community in working toward the best possible Whisperz
- Enable a sustainable system for Whisperz's maintainers to review contributions

## Development Setup

### Prerequisites

- Node.js >= 16.0.0
- npm >= 7.0.0
- Git

### Local Development

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/Whisperz.git
   cd Whisperz
   ```

3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/danxdz/Whisperz.git
   ```

4. Install dependencies:
   ```bash
   npm install
   ```

5. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

### Running Tests

```bash
# Run linter
npm run lint

# Run security audit
npm run security-check

# Run tests (when configured)
npm test
```

## Style Guidelines

### JavaScript/React Style Guide

We use ESLint to maintain code quality. Please ensure your code passes linting:

```bash
npm run lint
```

**Key Guidelines:**
- Use functional components with hooks
- Prefer `const` over `let`, avoid `var`
- Use meaningful variable and function names
- Add JSDoc comments for complex functions
- Keep components small and focused
- Use proper React patterns (hooks, context, etc.)

### CSS Style Guide

- Use CSS variables for theming
- Follow BEM naming convention for classes
- Keep specificity low
- Mobile-first responsive design
- Use semantic HTML elements

### File Organization

```
src/
├── services/       # Business logic and API services
├── utils/          # Utility functions
├── components/     # React components (when refactored)
├── hooks/          # Custom React hooks (when added)
└── styles/         # Global styles and themes
```

## Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that don't affect code meaning (formatting, etc.)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `chore`: Changes to build process or auxiliary tools
- `ci`: Changes to CI configuration files and scripts

### Examples
```
feat(chat): add typing indicators

Add real-time typing indicators to show when other users are typing.
This improves the chat experience by providing visual feedback.

Closes #123
```

```
fix(auth): resolve login timeout issue

Increase authentication timeout from 5s to 15s to accommodate
slower network connections.

Fixes #456
```

## Pull Request Process

1. **Branch Naming**: Use descriptive branch names
   - `feature/add-voice-chat`
   - `fix/message-encryption-bug`
   - `docs/update-readme`

2. **Before Submitting**:
   - Update the README.md with details of changes if needed
   - Update the CHANGELOG.md following the format
   - Ensure all tests pass
   - Verify no linting errors
   - Test your changes thoroughly

3. **PR Description Template**:
   ```markdown
   ## Description
   Brief description of what this PR does.

   ## Type of Change
   - [ ] Bug fix (non-breaking change which fixes an issue)
   - [ ] New feature (non-breaking change which adds functionality)
   - [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
   - [ ] Documentation update

   ## Testing
   - [ ] I have tested this locally
   - [ ] I have added tests that prove my fix/feature works
   - [ ] All new and existing tests pass

   ## Checklist
   - [ ] My code follows the style guidelines
   - [ ] I have performed a self-review
   - [ ] I have commented complex code
   - [ ] I have made corresponding changes to the documentation
   - [ ] My changes generate no new warnings
   ```

4. **Review Process**:
   - At least one maintainer approval required
   - All CI checks must pass
   - No merge conflicts
   - Conversations resolved

## Community

### Getting Help

- **Discord**: [Join our Discord](https://discord.gg/whisperz) (if available)
- **GitHub Discussions**: For general questions and discussions
- **Stack Overflow**: Tag your questions with `whisperz`

### Recognition

Contributors who make significant contributions will be:
- Added to the CONTRIBUTORS.md file
- Mentioned in release notes
- Given credit in the project documentation

## 📜 License

By contributing to Whisperz, you agree that your contributions will be licensed under its MIT License.

## 🙏 Thank You!

Thank you for taking the time to contribute to Whisperz! Your efforts help make secure, decentralized communication accessible to everyone.

---

**Questions?** Feel free to [open an issue](https://github.com/danxdz/Whisperz/issues/new) or reach out to the maintainers.