import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
// import { Link } from '@builder.io/qwik-city';

export default component$(() => {
  return (
    <div>
      <h1>
        House Work <span class="lightning">🚧</span>
      </h1>
      <div>Matthew</div>
      <div>Ellen</div>
      <hr/>
      <h1>
        Cooking <span class="lightning">🍳</span>
      </h1>
      <div>Today's meal is...</div>

    </div>
  );
});

export const head: DocumentHead = {
  title: 'Welcome to Qwik',
};
