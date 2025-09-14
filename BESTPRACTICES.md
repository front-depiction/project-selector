
## Part VI: UI Components with React

### Core Principle: Composition Over Configuration

React components suffer from the same problems as functions—accumulating boolean props and configuration options until they become unmaintainable. The solution is the same: composition. Build small, focused components that compose into complex UIs rather than monolithic components with dozens of conditional branches.

### The Boolean Prop Anti-Pattern

Every boolean prop in your component is a code smell. It indicates you're trying to make one component do too many things.

```typescript
// WRONG: The path to component hell
interface UserFormProps {
  isUpdateUser?: boolean;
  isEditNameOnly?: boolean;
  hideWelcomeMessage?: boolean;
  hideTermsAndConditions?: boolean;
  shouldRedirectToOnboarding?: boolean;
  isSlugRequired?: boolean;
  showEmailField?: boolean;
  // ...20 more booleans
}

function UserForm(props: UserFormProps) {
  // Component becomes a maze of conditionals
  return (
    <>
      {!props.hideWelcomeMessage && <WelcomeMessage />}
      {props.isUpdateUser ? (
        <UpdateHeader />
      ) : (
        <CreateHeader />
      )}
      {props.showEmailField && <EmailField required={!props.isUpdateUser} />}
      {/* Endless conditionals... */}
    </>
  );
}

// CORRECT: Compose specific forms from atomic pieces
function CreateUserForm() {
  return (
    <UserForm.Provider>
      <WelcomeMessage />
      <CreateHeader />
      <UserForm.NameField />
      <UserForm.EmailField required />
      <UserForm.TermsAndConditions />
      <UserForm.SubmitButton onSuccess={redirectToOnboarding} />
    </UserForm.Provider>
  );
}

function UpdateUserNameForm() {
  const user = useUser();
  
  return (
    <UserForm.Provider initialUser={user.data}>
      <UpdateHeader />
      <UserForm.NameField />
      <UserForm.SaveButton />
    </UserForm.Provider>
  );
}
```

### The Problem with Monolithic Components

Consider building a Slack-like composer. The naive approach leads to disaster:

```typescript
// WRONG: Monolith with endless conditionals
function Composer({ 
  onSubmit, 
  isThread, 
  channelId, 
  isDMThread, 
  dmId,
  isEditingMessage,
  onCancel,
  isForwarding,
  hideAttachments,
  hideEmojis,
  // ... dozens more props
}) {
  return (
    <Form>
      <Header />
      <Input />
      {isDMThread ? (
        <AlsoSendToDirectMessageField id={dmId} />
      ) : isThread ? (
        <AlsoSendToChannelField id={channelId} />
      ) : null}
      <Footer 
        onSubmit={onSubmit}
        isEditingMessage={isEditingMessage}
        onCancel={onCancel}
      />
    </Form>
  );
}

// The Footer becomes a nightmare
function Footer({ onSubmit, isEditingMessage, onCancel }) {
  return (
    <>
      {!isEditingMessage && <PlusMenu />}
      <TextFormat />
      <Emojis />
      {!isEditingMessage && <Mentions />}
      {!isEditingMessage && <Divider />}
      {!isEditingMessage && <Video />}
      {!isEditingMessage && <Audio />}
      {!isEditingMessage && <Divider />}
      {!isEditingMessage && <SlashCommands />}
      
      {isEditingMessage ? (
        <>
          <CancelEditing onCancel={onCancel} />
          <SubmitEditing onSubmit={onSubmit} />
        </>
      ) : (
        <Submit onSubmit={onSubmit} />
      )}
    </>
  );
}
```

### Component Module Pattern

Treat React components like Effect modules—each component is a module with its namespace, containing all related sub-components, hooks, types, and utilities.

```typescript
// components/Composer/index.tsx
export * as Composer from "./Composer";

// components/Composer/Composer.tsx
import * as React from "react";
import * as Effect from "effect/Effect";
import * as Context from "effect/Context";

// ============================================================================
// TYPES
// ============================================================================

export interface ComposerState {
  readonly content: string;
  readonly attachments: ReadonlyArray<Attachment>;
  readonly mentions: ReadonlyArray<Mention>;
}

export interface ComposerActions {
  readonly updateContent: (content: string) => void;
  readonly addAttachment: (attachment: Attachment) => void;
  readonly submit: () => Effect.Effect<void, SubmitError>;
}

// ============================================================================
// CONTEXT
// ============================================================================

const ComposerContext = React.createContext<
  (ComposerState & ComposerActions) | null
>(null);

export const useComposer = () => {
  const context = React.useContext(ComposerContext);
  if (!context) {
    throw new Error("useComposer must be used within ComposerProvider");
  }
  return context;
};

// ============================================================================
// PROVIDER
// ============================================================================

export interface ProviderProps {
  readonly children: React.ReactNode;
  readonly state: ComposerState;
  readonly actions: ComposerActions;
}

export const Provider: React.FC<ProviderProps> = ({ 
  children, 
  state, 
  actions 
}) => {
  const value = React.useMemo(
    () => ({ ...state, ...actions }),
    [state, actions]
  );
  
  return (
    <ComposerContext.Provider value={value}>
      {children}
    </ComposerContext.Provider>
  );
};

// ============================================================================
// COMPONENTS - Atomic building blocks
// ============================================================================

export const Frame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="composer-frame">
    {children}
  </div>
);

export const Header: React.FC = () => {
  const { mentions } = useComposer();
  return (
    <div className="composer-header">
      {mentions.length > 0 && <MentionsList mentions={mentions} />}
    </div>
  );
};

export const Input: React.FC = () => {
  const { content, updateContent } = useComposer();
  
  return (
    <textarea
      className="composer-input"
      value={content}
      onChange={(e) => updateContent(e.target.value)}
      placeholder="Type a message..."
    />
  );
};

export const Footer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="composer-footer">
    {children}
  </div>
);

// ============================================================================
// ACTION BUTTONS - Individual, composable actions
// ============================================================================

export const PlusMenu: React.FC = () => (
  <button className="composer-action">
    <PlusIcon />
  </button>
);

export const TextFormat: React.FC = () => (
  <button className="composer-action">
    <FormatIcon />
  </button>
);

export const Emojis: React.FC = () => (
  <button className="composer-action">
    <EmojiIcon />
  </button>
);

export const Mentions: React.FC = () => (
  <button className="composer-action">
    <MentionIcon />
  </button>
);

export const Submit: React.FC = () => {
  const { content, submit } = useComposer();
  
  return (
    <button 
      className="composer-submit"
      disabled={content.trim().length === 0}
      onClick={() => Effect.runPromise(submit())}
    >
      <SendIcon />
    </button>
  );
};

// ============================================================================
// COMPOUND COMPONENTS - Reusable combinations
// ============================================================================

export const CommonActions: React.FC = () => (
  <>
    <PlusMenu />
    <TextFormat />
    <Emojis />
    <Mentions />
    <Divider />
    <Video />
    <Audio />
    <Divider />
    <SlashCommands />
  </>
);

// ============================================================================
// FEATURE COMPONENTS
// ============================================================================

export const DropZone: React.FC = () => {
  const { addAttachment } = useComposer();
  
  return (
    <div 
      className="composer-dropzone"
      onDrop={(e) => /* handle drop */}
    >
      Drop files here
    </div>
  );
};

export const AlsoSendToChannel: React.FC<{ channelId: string }> = ({ channelId }) => {
  const [checked, setChecked] = React.useState(false);
  
  return (
    <label className="composer-also-send">
      <input 
        type="checkbox" 
        checked={checked}
        onChange={(e) => setChecked(e.target.checked)}
      />
      Also send to #{channelId}
    </label>
  );
};
```

### Implementation Through Composition

Now create specific implementations by composing these pieces—no boolean props needed:

```typescript
// components/ChannelComposer.tsx
export const ChannelComposer: React.FC = () => {
  // State comes from a global hook (synced across devices)
  const state = useGlobalChannel();
  
  return (
    <Composer.Provider state={state.composer} actions={state.actions}>
      <Composer.DropZone />
      <Composer.Frame>
        <Composer.Header />
        <Composer.Input />
        <Composer.Footer>
          <Composer.CommonActions />
          <Composer.Submit />
        </Composer.Footer>
      </Composer.Frame>
    </Composer.Provider>
  );
};

// components/ThreadComposer.tsx
export const ThreadComposer: React.FC<{ channelId: string }> = ({ channelId }) => {
  const state = useThreadChannel();
  
  return (
    <Composer.Provider state={state.composer} actions={state.actions}>
      <Composer.DropZone />
      <Composer.Frame>
        <Composer.Header />
        <Composer.Input />
        <Composer.AlsoSendToChannel channelId={channelId} />
        <Composer.Footer>
          <Composer.CommonActions />
          <Composer.Submit />
        </Composer.Footer>
      </Composer.Frame>
    </Composer.Provider>
  );
};

// components/EditMessageComposer.tsx
export const EditMessageComposer: React.FC<{ onCancel: () => void }> = ({ onCancel }) => {
  const state = useEditMessage();
  
  return (
    <Composer.Provider state={state.composer} actions={state.actions}>
      {/* No DropZone - editing doesn't support attachments */}
      <Composer.Frame>
        <Composer.Header />
        <Composer.Input />
        <Composer.Footer>
          {/* Only specific actions needed for editing */}
          <Composer.TextFormat />
          <Composer.Emojis />
          {/* Custom buttons just for editing */}
          <Cancel onCancel={onCancel} />
          <Submit />
        </Composer.Footer>
      </Composer.Frame>
    </Composer.Provider>
  );
};
```

### The Critical Pattern: Lifting State

State lifting is the key to flexible composition. It means moving state ABOVE the components that need it, into a provider that wraps them all.

#### Why Lift State?

Consider the forward message modal where the Forward button is OUTSIDE the composer:

```typescript
// WRONG: State trapped inside component
function ForwardMessageComposer() {
  const [state, setState] = useState(initialState);
  
  return (
    <Composer.Provider state={state}>
      <Composer.Frame>
        {/* ... composer internals ... */}
      </Composer.Frame>
    </Composer.Provider>
  );
}

function ForwardMessageModal() {
  return (
    <Modal>
      <ForwardMessageComposer />
      {/* How does this button access the composer's state? */}
      <ForwardButton onClick={???} />
    </Modal>
  );
}
```

The Forward button can't access the composer's state because it's trapped inside the component!

#### The Solution: Lift the Provider

```typescript
// CORRECT: State lifted above both components
function ForwardMessageComposer() {
  return (
    // No provider here - just the UI
    <Composer.Frame>
      <Composer.Header />
      <Composer.Input />
      <Composer.Footer>
        <Composer.TextFormat />
        <Composer.Emojis />
        <Composer.Mentions />
      </Composer.Footer>
    </Composer.Frame>
  );
}

function ForwardMessageModal() {
  // State lives at this level
  const [state, setState] = useState(initialState);
  const forwardMessage = useForwardMessage();
  
  const actions = {
    updateContent: (content: string) => setState(s => ({ ...s, content })),
    submit: () => forwardMessage(state.content)
  };
  
  return (
    // Provider wraps EVERYTHING that needs access
    <Composer.Provider state={state} actions={actions}>
      <Modal>
        <ForwardMessageComposer />
        <MessagePreview />
        {/* This button can now access composer state! */}
        <Dialog.Close>
          <ForwardButton />
        </Dialog.Close>
      </Modal>
    </Composer.Provider>
  );
}

// The button outside the composer can access its state
const ForwardButton: React.FC = () => {
  const { submit } = Composer.useComposer();
  
  return (
    <Button onClick={() => Effect.runPromise(submit())}>
      Forward
    </Button>
  );
};
```

### State Lifting Principles

1. **Lift Early**: Don't wait until you need it—design with lifted state from the start
2. **Provider Scope**: The provider should wrap ALL components that need access to the state
3. **UI/State Separation**: Components render UI; providers manage state
4. **Flexible Boundaries**: Components outside the visual boundary can still access state

```typescript
// Visual representation of lifted state
<Provider>                    {/* State lives here */}
  <VisualContainer>           {/* Visual boundary */}
    <ComponentA />            {/* Can access state */}
    <ComponentB />            {/* Can access state */}
  </VisualContainer>
  <ComponentC />              {/* Can ALSO access state! */}
</Provider>
```

### Decouple State Implementation from UI

The UI doesn't care where state comes from—local React state, Redux, Zustand, or synced across devices:

```typescript
// Local ephemeral state (for modals)
const useLocalComposer = () => {
  const [state, setState] = React.useState(initialState);
  
  return {
    ...state,
    updateContent: (content) => setState(s => ({ ...s, content })),
    submit: () => Effect.succeed(undefined)
  };
};

// Global synced state (for persistent composers)
const useGlobalComposer = () => {
  const { composer, sendMessage } = useChannelSync();
  
  return {
    ...composer,
    updateContent: (content) => updateGlobalDraft(content),
    submit: () => sendMessage()
  };
};

// The SAME UI components work with either
<Composer.Provider state={state} actions={actions}>
  <Composer.Input /> {/* Doesn't know or care about state implementation */}
</Composer.Provider>
```

### Visual Example: The Power of Composition

Instead of a monolithic component with boolean props determining what to render:

```typescript
// WRONG: Arrays of actions with complex conditionals
const actions = [
  { icon: "Plus", isMenu: true, menuItems: [...] },
  { icon: "TextFormat", onPress: onFormat },
  { icon: "Emoji", onPress: onEmoji },
  { icon: "Mention", onPress: onMention, divider: true },
  // Complex array that loops with conditions
];
```

Use JSX directly—it's already the perfect abstraction for UI:

```typescript
// CORRECT: Just use JSX
<Composer.Footer>
  <Composer.PlusMenu />
  <Composer.TextFormat />
  <Composer.Emojis />
  <Composer.Mentions />
  <Composer.Divider />
  <Composer.Video />
  <Composer.Audio />
</Composer.Footer>
```

### Component Testing

Composition makes testing straightforward—test each piece in isolation:

```typescript
// Test individual components
describe("Composer.Input", () => {
  it("updates content on change", () => {
    const updateContent = jest.fn();
    const state = { content: "Hello", attachments: [], mentions: [] };
    const actions = { updateContent, addAttachment: jest.fn(), submit: jest.fn() };
    
    render(
      <Composer.Provider state={state} actions={actions}>
        <Composer.Input />
      </Composer.Provider>
    );
    
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "World" } });
    
    expect(updateContent).toHaveBeenCalledWith("World");
  });
});

// Test composed features
describe("EditMessageComposer", () => {
  it("does not render attachment button", () => {
    render(<EditMessageComposer onCancel={jest.fn()} />);
    expect(screen.queryByTestId("attachment-button")).not.toBeInTheDocument();
  });
});
```

### React + Effect Integration

React and Effect share the same compositional philosophy. Use Effect for business logic and React for UI:

```typescript
// Business logic in Effect
export class MessageService extends Context.Tag("MessageService")<
  MessageService,
  {
    readonly send: (content: string) => Effect.Effect<Message, SendError>;
    readonly edit: (id: string, content: string) => Effect.Effect<Message, EditError>;
  }
>() {}

// React hook to bridge Effect and React
export const useMessageService = () => {
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  
  const send = React.useCallback((content: string) => {
    setSending(true);
    setError(null);
    
    return pipe(
      MessageService,
      Effect.flatMap(service => service.send(content)),
      Effect.runPromise
    ).then(
      (message) => {
        setSending(false);
        return message;
      },
      (error) => {
        setSending(false);
        setError(error);
        throw error;
      }
    );
  }, []);
  
  return { send, sending, error };
};
```

### Guidelines for Compositional UI

1. **No Boolean Props**: If you're adding a boolean prop, create a new component instead
2. **Lift State Early**: Don't wait until you need it—lift state to providers from the start
3. **One Component, One Concern**: Each component does exactly one thing
4. **Compose, Don't Configure**: Build complex UIs by composing simple pieces
5. **Namespace Imports**: Import component modules as namespaces for clarity
6. **Provider Pattern**: Use context providers for state, not prop drilling
7. **Escape Hatches**: Always provide ways to render custom implementations

### The Result

Instead of a 500-line component with 30 boolean props, you have:
- Small, focused components that are easy to understand
- Flexible composition that handles any use case
- Clear separation between UI and state management
- Testable pieces that work in isolation
- AI-friendly code that's hard to get wrong

Remember: **Composition is all you need**.

### React Best Practices: Beyond Composition

## You Might Not Need an Effect

Effects are often overused in React. Most of the time, you don't need them. Here's when to avoid Effects and what to use instead.

### Transforming Data for Rendering

```typescript
// WRONG: Effect to compute derived state
function TodoList({ todos, filter }) {
  const [visibleTodos, setVisibleTodos] = useState([]);
  
  useEffect(() => {
    setVisibleTodos(todos.filter(todo => {
      if (filter === 'active') return !todo.completed;
      if (filter === 'completed') return todo.completed;
      return true;
    }));
  }, [todos, filter]);
  
  return <ul>{visibleTodos.map(...)}</ul>;
}

// CORRECT: Calculate during render
function TodoList({ todos, filter }) {
  const visibleTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });
  
  return <ul>{visibleTodos.map(...)}</ul>;
}

// OPTIMAL: Memoize expensive calculations
function TodoList({ todos, filter }) {
  const visibleTodos = useMemo(() => 
    todos.filter(todo => {
      if (filter === 'active') return !todo.completed;
      if (filter === 'completed') return todo.completed;
      return true;
    }), 
    [todos, filter]
  );
  
  return <ul>{visibleTodos.map(...)}</ul>;
}
```

### Resetting State When Props Change

```typescript
// WRONG: Effect to reset state
function ProfilePage({ userId }) {
  const [comment, setComment] = useState('');
  
  useEffect(() => {
    setComment(''); // Reset when user changes
  }, [userId]);
  
  return <CommentForm comment={comment} onChange={setComment} />;
}

// CORRECT: Use a key to reset component state
function ProfilePage({ userId }) {
  return (
    <CommentForm 
      key={userId} // Component remounts when userId changes
      userId={userId}
    />
  );
}

// ALTERNATIVE: Store previous value and reset during render
function ProfilePage({ userId }) {
  const [comment, setComment] = useState('');
  const [prevUserId, setPrevUserId] = useState(userId);
  
  if (userId !== prevUserId) {
    setPrevUserId(userId);
    setComment('');
  }
  
  return <CommentForm comment={comment} onChange={setComment} />;
}
```

### Adjusting State When Props Change

```typescript
// WRONG: Effect to sync state with props
function List({ items }) {
  const [selectedItem, setSelectedItem] = useState(null);
  
  useEffect(() => {
    // Reset selection if selected item was removed
    if (selectedItem && !items.includes(selectedItem)) {
      setSelectedItem(null);
    }
  }, [items, selectedItem]);
  
  return ...;
}

// CORRECT: Adjust during render
function List({ items }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [prevItems, setPrevItems] = useState(items);
  
  if (items !== prevItems) {
    setPrevItems(items);
    if (selectedItem && !items.includes(selectedItem)) {
      setSelectedItem(null);
    }
  }
  
  return ...;
}

// BETTER: Derive the valid selection
function List({ items }) {
  const [selectedId, setSelectedId] = useState(null);
  const selectedItem = items.find(item => item.id === selectedId) ?? null;
  
  return ...;
}
```

### Sharing Logic Between Event Handlers

```typescript
// WRONG: Effect to handle both mount and click
function ProductPage({ product }) {
  useEffect(() => {
    logVisit(product.id);
  }, [product.id]);
  
  const handleBuyClick = () => {
    logVisit(product.id); // Duplicated logic
    addToCart(product);
  };
  
  return <button onClick={handleBuyClick}>Buy</button>;
}

// CORRECT: Extract shared logic
function ProductPage({ product }) {
  const hasLoggedVisit = useRef(false);
  
  const logVisitOnce = () => {
    if (!hasLoggedVisit.current) {
      logVisit(product.id);
      hasLoggedVisit.current = true;
    }
  };
  
  // Log on first render
  if (!hasLoggedVisit.current) {
    logVisitOnce();
  }
  
  const handleBuyClick = () => {
    logVisitOnce();
    addToCart(product);
  };
  
  return <button onClick={handleBuyClick}>Buy</button>;
}
```

### Sending POST Requests

```typescript
// WRONG: POST request in Effect
function Form() {
  const [data, setData] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  
  useEffect(() => {
    if (submitted && data) {
      post('/api/register', data);
    }
  }, [submitted, data]);
  
  const handleSubmit = (formData) => {
    setData(formData);
    setSubmitted(true);
  };
  
  return ...;
}

// CORRECT: POST in event handler
function Form() {
  const handleSubmit = async (formData) => {
    await post('/api/register', formData);
  };
  
  return ...;
}
```

### Chains of Computations

```typescript
// WRONG: Chain of Effects setting state
function Game() {
  const [card, setCard] = useState(null);
  const [goldCardCount, setGoldCardCount] = useState(0);
  const [round, setRound] = useState(1);
  const [isGameOver, setIsGameOver] = useState(false);
  
  useEffect(() => {
    if (card !== null && card.gold) {
      setGoldCardCount(c => c + 1);
    }
  }, [card]);
  
  useEffect(() => {
    if (goldCardCount > 3) {
      setRound(r => r + 1);
      setGoldCardCount(0);
    }
  }, [goldCardCount]);
  
  useEffect(() => {
    if (round > 5) {
      setIsGameOver(true);
    }
  }, [round]);
  
  return ...;
}

// CORRECT: Calculate everything in event handler
function Game() {
  const [state, setState] = useState({
    card: null,
    goldCardCount: 0,
    round: 1,
    isGameOver: false
  });
  
  const playCard = (nextCard) => {
    setState(state => {
      let newState = { ...state, card: nextCard };
      
      if (nextCard.gold) {
        newState.goldCardCount++;
      }
      
      if (newState.goldCardCount > 3) {
        newState.round++;
        newState.goldCardCount = 0;
      }
      
      if (newState.round > 5) {
        newState.isGameOver = true;
      }
      
      return newState;
    });
  };
  
  return ...;
}
```

### Initializing the Application

```typescript
// WRONG: Effect for one-time initialization
function App() {
  useEffect(() => {
    loadDataFromLocalStorage();
    checkAuthToken();
  }, []);
  
  return ...;
}

// CORRECT: Initialize outside components
if (typeof window !== 'undefined') {
  loadDataFromLocalStorage();
  checkAuthToken();
}

function App() {
  return ...;
}

// OR: Use a flag for truly once-per-app initialization
let didInit = false;

function App() {
  useEffect(() => {
    if (!didInit) {
      didInit = true;
      loadDataFromLocalStorage();
      checkAuthToken();
    }
  }, []);
  
  return ...;
}
```

### Fetching Data

```typescript
// WRONG: Race conditions with Effects
function SearchResults({ query }) {
  const [results, setResults] = useState([]);
  
  useEffect(() => {
    fetch(`/api/search?q=${query}`)
      .then(res => res.json())
      .then(data => setResults(data)); // May set stale results
  }, [query]);
  
  return ...;
}

// BETTER: Cleanup function to ignore stale responses
function SearchResults({ query }) {
  const [results, setResults] = useState([]);
  
  useEffect(() => {
    let ignore = false;
    
    fetch(`/api/search?q=${query}`)
      .then(res => res.json())
      .then(data => {
        if (!ignore) {
          setResults(data);
        }
      });
    
    return () => {
      ignore = true;
    };
  }, [query]);
  
  return ...;
}

// BEST: Use a data fetching library or custom hook
import { useQuery } from '@tanstack/react-query';

function SearchResults({ query }) {
  const { data: results = [] } = useQuery({
    queryKey: ['search', query],
    queryFn: () => fetch(`/api/search?q=${query}`).then(res => res.json())
  });
  
  return ...;
}
```

## useTransition: Modern Loading States

Instead of manually managing loading states, use `useTransition` for non-blocking updates.

### The Old Way: Manual Loading States

```typescript
// OLD: Manual loading state management
function TabContainer() {
  const [activeTab, setActiveTab] = useState('posts');
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState(null);
  
  const switchTab = async (tab) => {
    setIsLoading(true);
    const newData = await fetchTabData(tab);
    setData(newData);
    setActiveTab(tab);
    setIsLoading(false);
  };
  
  return (
    <div>
      <TabButtons onSwitch={switchTab} active={activeTab} />
      {isLoading ? <Spinner /> : <TabContent data={data} />}
    </div>
  );
}
```

### The New Way: useTransition

```typescript
// NEW: useTransition for non-blocking updates
import { useTransition, Suspense } from 'react';

function TabContainer() {
  const [activeTab, setActiveTab] = useState('posts');
  const [isPending, startTransition] = useTransition();
  
  const switchTab = (tab) => {
    startTransition(() => {
      setActiveTab(tab);
    });
  };
  
  return (
    <div>
      <TabButtons 
        onSwitch={switchTab} 
        active={activeTab}
        isPending={isPending}
      />
      <Suspense fallback={<Spinner />}>
        <TabContent tab={activeTab} />
      </Suspense>
    </div>
  );
}

// The tab content fetches its own data
function TabContent({ tab }) {
  const data = use(fetchTabData(tab)); // React 19 'use' hook
  return <div>{/* render data */}</div>;
}
```

### Real-World Example: Search with Transitions

```typescript
// Without transitions: UI blocks during search
function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const handleSearch = async (value) => {
    setQuery(value);
    setIsSearching(true);
    const data = await searchAPI(value);
    setResults(data);
    setIsSearching(false);
  };
  
  return (
    <div>
      <SearchInput 
        value={query} 
        onChange={handleSearch}
        disabled={isSearching}
      />
      {isSearching ? (
        <LoadingSpinner />
      ) : (
        <SearchResults results={results} />
      )}
    </div>
  );
}

// With transitions: UI stays responsive
function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();
  
  const handleSearch = (value) => {
    setQuery(value); // Update input immediately
    
    startTransition(async () => {
      const data = await searchAPI(value);
      setResults(data); // Update results in transition
    });
  };
  
  return (
    <div>
      <SearchInput 
        value={query} 
        onChange={handleSearch}
      />
      <div style={{ opacity: isPending ? 0.6 : 1 }}>
        <SearchResults results={results} />
      </div>
    </div>
  );
}
```

### Filtering Large Lists

```typescript
// Without transitions: Input lags with large lists
function FilterableList({ items }) {
  const [filter, setFilter] = useState('');
  
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(filter.toLowerCase())
  );
  
  return (
    <div>
      <input
        value={filter}
        onChange={e => setFilter(e.target.value)}
        placeholder="Filter items..."
      />
      <ul>
        {filteredItems.map(item => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );
}

// With transitions: Input stays responsive
function FilterableList({ items }) {
  const [filter, setFilter] = useState('');
  const [displayFilter, setDisplayFilter] = useState('');
  const [isPending, startTransition] = useTransition();
  
  const handleFilterChange = (value) => {
    setFilter(value); // Update input immediately
    
    startTransition(() => {
      setDisplayFilter(value); // Update filtered list in transition
    });
  };
  
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(displayFilter.toLowerCase())
  );
  
  return (
    <div>
      <input
        value={filter}
        onChange={e => handleFilterChange(e.target.value)}
        placeholder="Filter items..."
      />
      <ul style={{ opacity: isPending ? 0.5 : 1 }}>
        {filteredItems.map(item => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Form Validation with Transitions

```typescript
// Complex form validation that doesn't block typing
function ValidatedForm() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [isPending, startTransition] = useTransition();
  
  const handleInputChange = (field, value) => {
    // Update input immediately
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Validate in transition (won't block typing)
    startTransition(async () => {
      const validationErrors = await validateField(field, value);
      setErrors(prev => ({ ...prev, [field]: validationErrors }));
    });
  };
  
  return (
    <form>
      <input
        value={formData.email}
        onChange={e => handleInputChange('email', e.target.value)}
        className={errors.email ? 'error' : ''}
      />
      {errors.email && (
        <span style={{ opacity: isPending ? 0.5 : 1 }}>
          {errors.email}
        </span>
      )}
      {/* More fields... */}
    </form>
  );
}
```

### Best Practices for Transitions

1. **User Input Should Never Block**: Keep input fields responsive by updating them outside transitions
2. **Visual Feedback**: Use `isPending` to show that something is happening (opacity, spinner, etc.)
3. **Combine with Suspense**: For data fetching, combine transitions with Suspense boundaries
4. **Don't Overuse**: Not everything needs a transition—use for expensive updates that would block the UI

```typescript
// Complete example: Data table with sorting and filtering
function DataTable({ data }) {
  const [sortColumn, setSortColumn] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [filter, setFilter] = useState('');
  
  // Display states (updated in transitions)
  const [displaySort, setDisplaySort] = useState({ column: 'name', direction: 'asc' });
  const [displayFilter, setDisplayFilter] = useState('');
  
  const [isSorting, startSortTransition] = useTransition();
  const [isFiltering, startFilterTransition] = useTransition();
  
  const handleSort = (column) => {
    const newDirection = 
      column === sortColumn && sortDirection === 'asc' ? 'desc' : 'asc';
    
    setSortColumn(column);
    setSortDirection(newDirection);
    
    startSortTransition(() => {
      setDisplaySort({ column, direction: newDirection });
    });
  };
  
  const handleFilter = (value) => {
    setFilter(value);
    
    startFilterTransition(() => {
      setDisplayFilter(value);
    });
  };
  
  // Expensive computation happens with display values
  const processedData = useMemo(() => {
    let result = [...data];
    
    // Filter
    if (displayFilter) {
      result = result.filter(item =>
        Object.values(item).some(val =>
          String(val).toLowerCase().includes(displayFilter.toLowerCase())
        )
      );
    }
    
    // Sort
    result.sort((a, b) => {
      const aVal = a[displaySort.column];
      const bVal = b[displaySort.column];
      const multiplier = displaySort.direction === 'asc' ? 1 : -1;
      return aVal > bVal ? multiplier : -multiplier;
    });
    
    return result;
  }, [data, displayFilter, displaySort]);
  
  const isPending = isSorting || isFiltering;
  
  return (
    <div>
      <input
        value={filter}
        onChange={e => handleFilter(e.target.value)}
        placeholder="Filter..."
      />
      
      <table style={{ opacity: isPending ? 0.6 : 1 }}>
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col} onClick={() => handleSort(col)}>
                {col}
                {sortColumn === col && (
                  <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {processedData.map(row => (
            <tr key={row.id}>
              {/* Render row */}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Summary: Effects and Transitions

**Avoid Effects when you can:**
- Calculate derived state during render
- Reset components with keys
- Update state in event handlers
- Use proper cleanup for async operations

**Use Transitions for:**
- Expensive computations that would block the UI
- Large list filtering/sorting
- Tab switching with data fetching
- Form validation that shouldn't block typing

The goal is always the same: **Keep the UI responsive and predictable**.
