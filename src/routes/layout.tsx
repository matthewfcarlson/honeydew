import { component$, Slot } from '@builder.io/qwik';
import Header from '../components/header/header';

export default component$(() => {
  return (
    <>
      <main>
        <Header />
        <section>
          <Slot />
        </section>
      </main>
      <footer>
        <a href="https://www.matthewc.dev/" target="_blank">
          Made with ♡ by Matthew Carlson
        </a>
      </footer>
    </>
  );
});
