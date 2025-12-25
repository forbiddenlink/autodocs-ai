# Development Guide for Future Agents

## 🎯 Your Mission

Implement features from `feature_list.json` one at a time, test thoroughly, and mark as passing when complete.

## 📋 Feature List Rules

### CRITICAL - READ THIS FIRST

1. **feature_list.json is SACRED**
   - ❌ NEVER remove features
   - ❌ NEVER edit descriptions
   - ❌ NEVER modify test steps
   - ✅ ONLY change `"passes": false` to `"passes": true`

2. **Why This Matters**
   - Ensures no functionality is missed
   - Maintains complete test coverage
   - Tracks progress across sessions
   - Prevents scope creep

## 🔄 Workflow

### 1. Choose Next Feature

```bash
# Find features with no dependencies or satisfied dependencies
# Look for features where all items in "dependencies" array have "passes": true
```

**Priority Order**:
1. Features with no dependencies
2. Features with satisfied dependencies
3. Simpler features before complex ones

### 2. Implement Feature

- Read the test steps carefully
- Implement to satisfy ALL test steps
- Write clean, maintainable code
- Follow existing patterns in codebase

### 3. Test Thoroughly

- Run through EVERY test step
- Test edge cases
- Test error conditions
- Verify in both light and dark mode (if UI)
- Test responsive design (if UI)

### 4. Mark as Passing

Only change `"passes": false` to `"passes": true` when:
- ✅ All test steps pass
- ✅ No errors in console
- ✅ Code is clean and commented
- ✅ Follows project conventions

### 5. Commit

```bash
git add .
git commit -m "Implement feature #X: [description]

- Detail what was implemented
- Mention any important decisions
- Note any dependencies satisfied

🤖 Generated with Claude Code (https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

## 📊 Feature Categories

### Functional Features (category: "functional")
Test that features work correctly:
- User flows
- API endpoints
- Data persistence
- Business logic

### Style Features (category: "style")
Test visual and UX requirements:
- Responsive design
- Visual consistency
- Animations
- Theming

## 🔧 Complexity Levels

### Simple (2-5 steps)
- UI changes
- Button clicks
- Basic forms
- Simple navigation

### Medium (5-10 steps)
- Multi-step workflows
- Form validation
- Basic API integration
- State management

### Complex (10+ steps)
- AI integration
- External APIs
- Complex state
- Multi-component features

## 🏗️ Project Structure Guide

### Frontend (Next.js 14 App Router)

```
app/
├── page.tsx              # Landing page (/)
├── dashboard/
│   └── page.tsx         # Repository list
├── repos/[id]/
│   ├── page.tsx         # Documentation viewer
│   ├── chat/
│   │   └── page.tsx     # AI chat
│   └── settings/
│       └── page.tsx     # Repo settings
└── api/                 # API routes
    └── ...
```

### Backend (Express)

```
backend/src/
├── routes/              # API route handlers
│   ├── auth.js         # Authentication routes
│   ├── repos.js        # Repository routes
│   └── webhooks.js     # GitHub webhooks
├── services/           # Business logic
│   ├── github.js       # GitHub API integration
│   ├── claude.js       # Claude AI integration
│   ├── analyzer.js     # Code analysis
│   └── pinecone.js     # Vector embeddings
├── models/             # Data models
│   ├── User.js
│   ├── Repository.js
│   └── Document.js
└── middleware/         # Express middleware
    ├── auth.js         # Authentication
    └── rateLimiter.js  # Rate limiting
```

## 🔑 Key Technologies

### Frontend
- **Next.js 14** - App Router, Server Components
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS
- **shadcn/ui** - Component library

### Backend
- **Express** - Web framework
- **PostgreSQL** - Relational database
- **Pinecone** - Vector database
- **JWT** - Authentication tokens

### AI & Analysis
- **Claude API** - AI documentation generation
- **Tree-sitter** - Code parsing
- **RAG** - Retrieval-Augmented Generation

## 📝 Code Conventions

### TypeScript/JavaScript
- Use TypeScript for frontend
- Use ES modules (import/export)
- Async/await over promises
- Descriptive variable names
- Comments for complex logic

### React Components
```tsx
// Use functional components
export default function ComponentName() {
  // Hooks at the top
  const [state, setState] = useState();

  // Event handlers
  const handleClick = () => { };

  // Render
  return <div>...</div>;
}
```

### API Routes
```javascript
// Express route example
router.get('/endpoint', authenticate, async (req, res) => {
  try {
    // Logic here
    res.json({ data });
  } catch (error) {
    next(error);
  }
});
```

## 🧪 Testing Checklist

Before marking feature as passing:

- [ ] All test steps completed
- [ ] No console errors
- [ ] No network errors
- [ ] Works in Chrome/Firefox/Safari
- [ ] Responsive on mobile/tablet/desktop
- [ ] Dark mode works (if applicable)
- [ ] Loading states shown
- [ ] Error states handled
- [ ] Accessibility considerations met
- [ ] Code is clean and commented

## 🚨 Common Pitfalls

1. **Marking features as passing too early**
   - Test ALL steps thoroughly
   - Test edge cases

2. **Implementing wrong features**
   - Check dependencies are satisfied
   - Work in priority order

3. **Breaking existing features**
   - Test related features after changes
   - Don't modify passing features without re-testing

4. **Poor error handling**
   - Every API call needs try/catch
   - Show user-friendly error messages

5. **Forgetting to commit**
   - Commit after each feature
   - Clear commit messages

## 📈 Progress Tracking

Update `claude-progress.txt` with:
- Features completed this session
- Current feature count (X/200 passing)
- Blockers or issues encountered
- Notes for next agent

## 🎓 Best Practices

### Code Quality
- Write self-documenting code
- Add comments for complex logic
- Follow DRY principle
- Keep functions small and focused

### Git
- Commit frequently
- Descriptive commit messages
- One feature per commit

### Testing
- Test happy path
- Test error cases
- Test edge cases
- Test as a user would

### UI/UX
- Follow design system (shadcn/ui)
- Consistent spacing and typography
- Responsive design
- Accessibility (keyboard nav, screen readers)

## 🆘 Getting Unstuck

### If a feature is too complex:
1. Break it into smaller sub-tasks
2. Implement incrementally
3. Test each part before moving on

### If dependencies aren't clear:
1. Check the dependencies array
2. Read related feature descriptions
3. Implement simpler features first

### If tests are failing:
1. Review test steps carefully
2. Check for typos or logic errors
3. Use browser dev tools to debug
4. Check backend logs for errors

## ✅ Session End Checklist

Before ending your session:

- [ ] Commit all work
- [ ] Update claude-progress.txt
- [ ] Update feature_list.json with "passes": true
- [ ] Leave clear notes for next agent
- [ ] Document any blockers or decisions
- [ ] Ensure project is in working state

## 🎉 Success Metrics

You're doing great if:
- ✅ Features pass all their test steps
- ✅ No console errors
- ✅ Code is clean and maintainable
- ✅ Commit messages are clear
- ✅ Progress is documented
- ✅ Each session adds value

---

**Remember**: Quality over speed. Production-ready is the goal. You have unlimited time across many sessions.

**Good luck! 🚀**
