import { component$, useStylesScoped$ } from '@builder.io/qwik';
import { HoneydewLogo } from '../icons/qwik';
import styles from './header.css?inline';

export default component$(() => {
  useStylesScoped$(styles);

  return (
    <header>
      <div class="logo">
        <a href="/" >
          <HoneydewLogo />
        </a>
      </div>
      <ul>
        <li>
          <a href="/meal-plan">
            Meal Plan
          </a>
        </li>
        <li>
          <a href="/todo">
            Todo List
          </a>
        </li>
        <li>
          <a href="/login">
            Login
          </a>
        </li>
        <li>
          <a href="/logout">
            Logout
          </a>
        </li>
      </ul>
    </header>
  );
});
