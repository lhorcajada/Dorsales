# Dorsakes — Copilot Instructions

Monorepo with a React SPA (`Front/`)
Deploy target: **Netlify** (front)
---

## Overview
Queremos desarrollar una aplicación web para la asignación de dorsales para un equipo de futbol base. La idea es que los padres de los niños puedan registrarse, iniciar sesión en la aplicación y entrar en el modo concurso de la aplicación, donde podrán elegir un dorsal para su hijo. El sistema tendrá un reloj de cuenta atrás para el inicio de la asignación de dorsales, y una vez que el reloj llegue a cero, los padres podrán elegir un dorsal para su hijo. El sistema debe garantizar que cada dorsal solo pueda ser asignado a un niño, y una vez que un dorsal ha sido asignado, no estará disponible para otros padres. Además, el sistema debe permitir a los padres ver qué dorsales están disponibles y cuáles ya han sido asignados. El sistema también debe permitir a los administradores gestionar la lista de dorsales disponibles, así como ver y gestionar las asignaciones de dorsales realizadas por los padres. La aplicación debe ser fácil de usar, intuitiva y accesible desde cualquier dispositivo con conexión a internet. Además, se deben implementar medidas de seguridad para proteger la información personal de los usuarios y garantizar que solo los padres autorizados puedan asignar dorsales a sus hijos. El objetivo es crear una experiencia de usuario fluida y eficiente para la asignación de dorsales, facilitando la gestión para los administradores y proporcionando a los padres una plataforma confiable para asignar dorsales a sus hijos de manera justa y transparente.
El sistema debe ser capaz de manejar un gran número de usuarios simultáneamente, especialmente durante el período de asignación de dorsales, para garantizar que todos los padres tengan una oportunidad justa de asignar un dorsal a sus hijos. Además, se deben implementar medidas para prevenir el abuso del sistema, solo podrá identificarse un padre por hijo. Esto se puede lograr mediante la verificación de la identidad de los padres durante el proceso de registro, utilizando métodos como la verificación por correo electrónico o la autenticación de dos factores. También se pueden implementar límites en la cantidad de intentos de asignación de dorsales para evitar que los usuarios intenten asignar múltiples dorsales a sus hijos. Además, se deben implementar medidas para garantizar que el sistema sea justo y transparente, como mostrar claramente qué dorsales están disponibles y cuáles ya han sido asignados, y permitir a los padres ver un historial de las asignaciones realizadas. En resumen, el sistema debe ser capaz de manejar un gran número de usuarios simultáneamente, implementar medidas para prevenir el abuso del sistema y garantizar que el proceso de asignación de dorsales sea justo y transparente para todos los usuarios involucrados. El número de dorsales disponibles para asignar será de 100 y el número de niños a los que se les asignarán dorsales será de 100. Esto también permitirá una mayor flexibilidad en la gestión de las asignaciones de dorsales y garantizará que todos los niños tengan la oportunidad de recibir un dorsal, incluso si algunos padres deciden no participar en el proceso de asignación. En resumen, el sistema debe ser capaz de manejar un gran número de usuarios simultáneamente, implementar medidas para prevenir el abuso del sistema, garantizar que el proceso de asignación de dorsales sea justo y transparente para todos los usuarios involucrados, y permitir la asignación de dorsales a un número adecuado de niños para garantizar una experiencia satisfactoria para todos los participantes.
## Repository Layout

```
Front/                   # React SPA
  src/
    features/
      screen1/ # Screen-specific components and hooks
        components/ # Reusable components used only within this screen
        hooks/ # Custom hooks used only within this screen
        helpers/         # Pure functions, formatters, validators, etc.
        types/           # TypeScript types and interfaces specific to this screen
          requests/        # Request/response types for API calls
          state/           # Types for local component state or context
          responses/       # Types for API responses
        screen1.module.css # CSS Module for screen-specific styles   
        screen1.tsx        # Main screen component with route-level logic
        screen1.test.tsx   # Unit tests for screen1
    api/client.ts      # Axios singleton
    router/            # AppRouter + RequireAuth
    shared/              # Cross-app components, contexts, hooks, services, types
      components/       # Reusable UI components used across both apps
        layout/           # Layout components (AppShell, PageHeader, etc.)
        ui/               # Generic UI components (Button, Input, Modal, etc.)
        feedback/         # Feedback components (Toast, Alert, etc.)
        data-display/     # Data display components (Table, Card, etc.)
        navigation/       # Navigation components (NavBar, Breadcrumbs, etc.)
      context/          # React contexts (UserContext, CoachAuthContext)
      hooks/            # Custom hooks used across both apps
      services/         # API service files (clubService.ts, playerService.ts, …)
      types/            # TypeScript types and interfaces used across the app
  vite.config.ts
  package.json


---

## Frontend

### Stack
| Concern | Library |
|---|---|
| Framework | React 19 |
| Language | TypeScript 5.5 — strict mode, `ES2020` target |
| Bundler | Vite 7 + `@vitejs/plugin-react` |
| Routing | `react-router-dom` v6 (declarative `<Routes>`) |
| HTTP Client | Axios (`src/core/api/client.ts`) |
| Auth token signing | `jose` — HS256 temp-token generation |
| Date utilities | `date-fns` |
| PDF export | `html2canvas` + `jspdf` |
| Unit tests | Vitest 4 + Testing Library (React/DOM/user-event) |
| E2E tests | Playwright |
| Linting | ESLint (Airbnb config + custom rules) |
| Formatting | Prettier (config aligned with Airbnb style) |


### Styling Rules
- **CSS Modules** for every component/page: co-locate `ComponentName.module.css` alongside `ComponentName.tsx`.
- **BEM naming convention** for CSS classes: `block__element--modifier` (e.g., `button__icon--primary`).
- **No global CSS**: avoid styles that affect elements outside the component scope. 
- **Utility classes**: for common styles (e.g., `.text-center`, `.mb-4`), create a `utils.module.css` file in `src/shared/styles/` and import it where needed.
- **Responsive design**: use media queries in CSS Modules to ensure components are mobile-friendly. 
- **Theming**: theming is needed for light/dark mode support. Use CSS variables (e.g., `--color-primary`) defined in a global `theme.module.css` and toggle them based on user preference.
- **No inline styles**: avoid using the `style` prop for styling. Instead, define styles in CSS Modules to maintain consistency and leverage CSS features.
- **Component-specific styles**: each component should have its own CSS Module for styles that are specific to that component. This promotes encapsulation and makes it easier to manage styles as the project grows.
- **Shared styles**: for styles that are reused across multiple components, create shared CSS Modules in `src/shared/styles/` and import them where needed. This helps reduce duplication and maintain a consistent look and feel across the app.
- **Accessibility**: ensure that styles do not interfere with accessibility features. Use semantic HTML and ARIA attributes as needed to enhance accessibility.
- **Performance**: optimize CSS for performance by minimizing the use of complex selectors and avoiding unnecessary styles. Use tools like PurgeCSS to remove unused CSS in production builds.
- **Documentation**: document any non-obvious styling decisions in comments within the CSS Modules to help other developers understand the rationale behind certain styles or patterns. This can be especially helpful for complex components or when implementing workarounds for specific design requirements.
- **Testing styles**: when writing tests, ensure that you are testing the rendered output and behavior of components rather than relying on specific class names or styles. This helps maintain test robustness even if styles change over time.
- **Consistent naming**: maintain a consistent naming convention for CSS classes and variables to improve readability and maintainability. This includes using meaningful names that reflect the purpose of the styles and following the established BEM convention throughout the project.
- **Version control**: when making changes to styles, ensure that you are following best practices for version control. This includes creating descriptive commit messages that explain the changes made to styles and how they affect the overall design of the app. Additionally, consider using feature branches for larger style changes to allow for easier collaboration and review.
- Use the same design styles as the EA Sports FC26 soccer game to maintain a look that is consistent with the project’s theme. This includes colors, fonts, and visual elements that reflect the game’s aesthetic. Be sure to review the design resources available for EA Sports FC26 and apply those styles consistently throughout the app to create an engaging and thematically consistent visual experience for users.

### Infrastructure
- **Vite**: use Vite as the build tool and development server for the React SPA. Configure Vite to optimize the build process and enable features like hot module replacement (HMR) for a smooth development experience.
- **Netlify**: deploy the React SPA to Netlify for hosting. Set up continuous deployment from the main branch to ensure that changes are automatically deployed to production. Configure Netlify to handle routing for the SPA, ensuring that all routes are properly served and that client-side routing works as expected.
- **Environment variables**: manage environment variables securely using Vite's built-in support for `.env` files. Use different environment variable files for development and production (e.g., `.env.development`, `.env.production`) to manage API endpoints, authentication keys, and other sensitive information appropriately.
- **Code splitting**: implement code splitting in the React SPA to optimize load times and improve performance. Use dynamic imports and React's `Suspense` component to load components and routes on demand, reducing the initial bundle size and improving the user experience.
- **Testing infrastructure**: set up Vitest for unit testing and Playwright for end-to-end testing. Configure Vitest to run tests in a way that integrates well with the development workflow, and set up Playwright to automate browser testing for critical user flows and interactions within the app.
- **Linting and formatting**: use ESLint with the Airbnb configuration to enforce code quality and consistency across the codebase. Configure Prettier to automatically format code according to the established style guidelines, and integrate both tools into the development workflow to catch issues early and maintain a clean codebase.
- **Version control**: use Git for version control and follow best practices for branching and committing. Create feature branches for new features and bug fixes, and use descriptive commit messages to explain the changes made. Regularly merge changes back into the main branch and ensure that the codebase remains stable and well-maintained.   
- **Supabase**: use Supabase for backend services, including authentication, database management, and real-time features. Integrate Supabase with the React SPA to handle user authentication, data storage, and any necessary server-side logic. Ensure that the integration is secure and follows best practices for handling user data and authentication tokens.
- **Monitoring and analytics**: set up monitoring and analytics tools to track the performance and usage of the React SPA. Use tools like Google Analytics or a similar service to gather insights into user behavior and app performance, and use this data to inform future development and improvements to the app.
- **Documentation**: maintain clear and comprehensive documentation for the React SPA, including setup instructions, architectural decisions, and coding guidelines. This documentation should be easily accessible to all team members and updated regularly to reflect any changes or new features added to the app. Consider using a tool like Storybook for documenting UI components and their usage within the app.

## State of the project
- The scaffold for the React SPA has been created and is set up with the necessary dependencies and configurations. The project compiles successfully, and the development environment is ready for further development. The next natural step is to implement real authentication and persistence using Supabase or another backend solution that is defined for the project. This will involve setting up user registration, login, and session management, as well as integrating with the database to store user data and manage the assignment of dorsales. Once authentication and persistence are in place, we can proceed with implementing the core features of the app, such as the contest mode for parents to assign dorsales to their children and the administrative interface for managing dorsales and user accounts.
- Check the imports for all screens and components to ensure there are no incorrect or inconsistent import paths. Make sure all imports are using correct relative paths and that there are no typos in file or folder names. Also, verify that all necessary dependencies are properly installed and that there are no imports of modules that do not exist in the project. If you find any import errors, fix them to ensure the code compiles correctly and works as expected.
- A React component should not exceed 100 lines of code. If a component exceeds this limit, it should be refactored by breaking it down into smaller, reusable components. This improves the code’s readability, maintainability, and testability, while also promoting the separation of concerns within the application. By splitting a large component into smaller ones, you can isolate the specific logic of each part of the user interface, making the code easier to understand and maintain in the long term. Additionally, smaller components are easier to test, as you can write unit tests specific to each component, which improves code quality and reduces the likelihood of errors.

- Use the same design style as the EA Sports FC26 soccer game to maintain a look that is consistent with the project’s theme. This includes colors, fonts, and visual elements that reflect the game’s aesthetic. Be sure to review the design resources available for EA Sports FC26 and apply those styles consistently throughout the app to create an engaging and thematically coherent visual experience for users.

- Create storybooks for each component of the application. This will help document the components and their different states, facilitating collaboration between developers and designers, and improving the long-term maintainability of the code. Storybooks allow you to view and test components in isolation, making it easier to identify issues and iterate quickly on component design and functionality. Additionally, storybooks can serve as a reference for other developers working on the project, providing clear examples of how components are expected to behave in different situations.

- Create base components—such as buttons, input fields, modals, and so on—that can be reused throughout the application. This will help maintain consistency in the app’s design and functionality, and it will also make it easier to develop new features by providing predefined components that can serve as building blocks for new screens and functionalities. By creating base components, you can ensure that common user interface elements have a consistent style and behavior throughout the application, which improves the user experience and makes code maintenance easier in the long run.
