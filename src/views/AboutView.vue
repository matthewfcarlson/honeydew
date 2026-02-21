<template>
  <div>
    <!-- About Hero -->
    <section class="hero is-small about-hero">
      <div class="hero-body">
        <div class="container has-text-centered">
          <h1 class="title is-2">About Honeydew</h1>
          <p class="subtitle is-5 about-subtitle">
            A household management app built to keep families organized &mdash; without the overhead.
          </p>
        </div>
      </div>
    </section>

    <!-- Story Section -->
    <section class="section">
      <div class="container">
        <div class="columns is-centered">
          <div class="column is-8">
            <h2 class="title is-4">Why Honeydew?</h2>
            <div class="content">
              <p>
                Running a household involves a lot of invisible work: figuring out what to eat tonight,
                remembering whose turn it is to clean the bathroom, keeping track of that long list of home
                improvement projects. It adds up quickly, and most of it lives in someone's head.
              </p>
              <p>
                Honeydew was built to take that mental load off your shoulders. Instead of sticky notes,
                shared spreadsheets, or just hoping everyone remembers, Honeydew gives your household a
                single place to coordinate chores, meals, and projects &mdash; and it handles the scheduling
                so you don't have to.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Detail Section -->
    <section class="section about-features-section">
      <div class="container">
        <h2 class="title is-3 has-text-centered mb-6">What Honeydew does</h2>

        <div class="columns is-centered mb-5">
          <div class="column is-10">
            <div class="box">
              <div class="columns is-vcentered">
                <div class="column is-2 has-text-centered">
                  <span class="icon is-large text-primary">
                    <i class="fa-solid fa-hand-sparkles fa-3x"></i>
                  </span>
                </div>
                <div class="column">
                  <h3 class="title is-5">Smart Chore Rotation</h3>
                  <p>
                    Add your household chores and let Honeydew figure out who does what. The assignment
                    algorithm considers how overdue each chore is and how recently someone was assigned,
                    so the workload stays balanced. Complete chores to build streaks and keep the momentum going.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="columns is-centered mb-5">
          <div class="column is-10">
            <div class="box">
              <div class="columns is-vcentered">
                <div class="column is-2 has-text-centered">
                  <span class="icon is-large text-success">
                    <i class="fa-solid fa-utensils fa-3x"></i>
                  </span>
                </div>
                <div class="column">
                  <h3 class="title is-5">Recipe Collection &amp; Meal Planning</h3>
                  <p>
                    Paste a URL from almost any recipe site and Honeydew will scrape the details automatically.
                    Build a collection of favorites, flag recipes to try, and generate a weekly meal plan
                    from your saved recipes. No more staring at the fridge wondering what to cook.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="columns is-centered mb-5">
          <div class="column is-10">
            <div class="box">
              <div class="columns is-vcentered">
                <div class="column is-2 has-text-centered">
                  <span class="icon is-large text-warning">
                    <i class="fa-solid fa-hammer fa-3x"></i>
                  </span>
                </div>
                <div class="column">
                  <h3 class="title is-5">Project &amp; Task Tracking</h3>
                  <p>
                    Home projects often stall because there's no clear next step. Break projects down into
                    tasks with dependency tracking, and Honeydew will surface the next actionable item
                    on your dashboard each day. Small steps add up to big results.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="columns is-centered mb-5">
          <div class="column is-10">
            <div class="box">
              <div class="columns is-vcentered">
                <div class="column is-2 has-text-centered">
                  <span class="icon is-large text-link">
                    <i class="fa-solid fa-shirt fa-3x"></i>
                  </span>
                </div>
                <div class="column">
                  <h3 class="title is-5">Wardrobe &amp; Outfit Tracking</h3>
                  <p>
                    Log your clothing, track when items were last worn, and mark them as clean or dirty.
                    Honeydew helps you make use of everything in your closet instead of cycling through
                    the same handful of outfits.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="columns is-centered mb-5">
          <div class="column is-10">
            <div class="box">
              <div class="columns is-vcentered">
                <div class="column is-2 has-text-centered">
                  <span class="icon is-large text-info">
                    <i class="fa-brands fa-telegram fa-3x"></i>
                  </span>
                </div>
                <div class="column">
                  <h3 class="title is-5">Telegram Integration</h3>
                  <p>
                    Link your Telegram account to get daily chore reminders, complete tasks with a tap,
                    and save recipes by sending a URL to the bot. Everything stays in sync between the
                    web app and Telegram.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Tech / Open Source -->
    <section class="section">
      <div class="container">
        <div class="columns is-centered">
          <div class="column is-8 has-text-centered">
            <h2 class="title is-4">Built in the open</h2>
            <p class="mb-4">
              Honeydew is an open-source project. It's built with Vue 3, runs on Cloudflare Workers,
              and stores data in Cloudflare D1. No heavy infrastructure, no tracking, no ads.
            </p>
            <a href="https://github.com/matthewfcarlson/honeydew" target="_blank" class="button is-dark is-outlined is-rounded">
              <span class="icon">
                <i class="fa-brands fa-github"></i>
              </span>
              <span>View on GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="section about-cta">
      <div class="container has-text-centered">
        <h2 class="title is-4">Want to try it?</h2>
        <p class="mb-4">Create an account and set up your household in under a minute.</p>
        <a href="/signup" class="button is-primary is-medium is-rounded">
          <span class="icon">
            <i class="fa-solid fa-user-plus"></i>
          </span>
          <span>Sign Up Free</span>
        </a>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
@import "../assets/variables.scss";

.about-hero {
  background: linear-gradient(135deg, lighten($nord0, 45%) 0%, lighten($nord8, 30%) 100%);
}

.about-subtitle {
  color: $nord3;
  max-width: 640px;
  margin-left: auto;
  margin-right: auto;
}

.about-features-section {
  background-color: $nord6;
}

.about-cta {
  padding-bottom: 4rem;
}
</style>
