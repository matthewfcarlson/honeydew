<template>
    <div>
        <!-- Hero Section -->
        <section class="hero is-medium landing-hero">
            <div class="hero-body">
                <div class="container has-text-centered">
                    <img alt="Honeydew logo" src="/images/text_logo.png" class="landing-logo mb-4" />
                    <p class="title is-2 fw-300 landing-title">
                        Your household, <span class="fw-700">organized</span>
                    </p>
                    <p class="subtitle is-5 landing-subtitle mt-3">
                        Chores, meals, projects, and more &mdash; all in one place so your home runs smoothly.
                    </p>
                    <div class="buttons is-centered mt-6">
                        <a href="/signup" class="button is-primary is-medium is-rounded">
                            <span class="icon">
                                <i class="fa-solid fa-user-plus"></i>
                            </span>
                            <span>Get Started</span>
                        </a>
                        <router-link to="/about" class="button is-outlined is-medium is-rounded">
                            <span class="icon">
                                <i class="fa-solid fa-circle-info"></i>
                            </span>
                            <span>Learn More</span>
                        </router-link>
                    </div>
                </div>
            </div>
        </section>

        <!-- Features Section -->
        <section class="section">
            <div class="container">
                <h2 class="title is-3 has-text-centered mb-6">Everything your household needs</h2>
                <div class="columns is-multiline">
                    <div class="column is-6-tablet is-3-desktop">
                        <div class="box has-text-centered feature-card">
                            <span class="icon is-large feature-icon text-primary">
                                <i class="fa-solid fa-hand-sparkles fa-2x"></i>
                            </span>
                            <h3 class="title is-5 mt-4">Chores</h3>
                            <p>Smart chore rotation that fairly assigns tasks and tracks streaks. No more arguments about whose turn it is.</p>
                        </div>
                    </div>
                    <div class="column is-6-tablet is-3-desktop">
                        <div class="box has-text-centered feature-card">
                            <span class="icon is-large feature-icon text-success">
                                <i class="fa-solid fa-utensils fa-2x"></i>
                            </span>
                            <h3 class="title is-5 mt-4">Meal Planning</h3>
                            <p>Save recipes from any website, plan your meals for the week, and keep a collection of family favorites.</p>
                        </div>
                    </div>
                    <div class="column is-6-tablet is-3-desktop">
                        <div class="box has-text-centered feature-card">
                            <span class="icon is-large feature-icon text-warning">
                                <i class="fa-solid fa-hammer fa-2x"></i>
                            </span>
                            <h3 class="title is-5 mt-4">Projects</h3>
                            <p>Break down home projects into tasks with dependencies. Tackle that renovation or garden plan step by step.</p>
                        </div>
                    </div>
                    <div class="column is-6-tablet is-3-desktop">
                        <div class="box has-text-centered feature-card">
                            <span class="icon is-large feature-icon text-link">
                                <i class="fa-solid fa-shirt fa-2x"></i>
                            </span>
                            <h3 class="title is-5 mt-4">Outfits</h3>
                            <p>Track your wardrobe, log what you wear, and get outfit suggestions so nothing sits forgotten in the closet.</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- How It Works Section -->
        <section class="section landing-how-it-works">
            <div class="container">
                <h2 class="title is-3 has-text-centered mb-6">How it works</h2>
                <div class="columns is-centered">
                    <div class="column is-4 has-text-centered">
                        <div class="step-number">1</div>
                        <h3 class="title is-5 mt-3">Create a household</h3>
                        <p>Sign up and create your household. It only takes a moment.</p>
                    </div>
                    <div class="column is-4 has-text-centered">
                        <div class="step-number">2</div>
                        <h3 class="title is-5 mt-3">Invite your family</h3>
                        <p>Share an invite link so everyone in your home can join and contribute.</p>
                    </div>
                    <div class="column is-4 has-text-centered">
                        <div class="step-number">3</div>
                        <h3 class="title is-5 mt-3">Stay on top of things</h3>
                        <p>Honeydew assigns chores, plans meals, and keeps projects moving &mdash; automatically.</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- Telegram Integration Callout -->
        <section class="section">
            <div class="container">
                <div class="box landing-telegram-box">
                    <div class="columns is-vcentered">
                        <div class="column is-8">
                            <h3 class="title is-4">
                                <span class="icon mr-2">
                                    <i class="fa-brands fa-telegram"></i>
                                </span>
                                Works with Telegram
                            </h3>
                            <p>Get reminders, complete chores, and save recipes right from Telegram. No app download required &mdash; just link your account and go.</p>
                        </div>
                        <div class="column is-4 has-text-centered">
                            <span class="icon is-large text-info">
                                <i class="fa-brands fa-telegram fa-4x"></i>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- CTA Section -->
        <section class="section landing-cta">
            <div class="container has-text-centered">
                <h2 class="title is-3">Ready to get organized?</h2>
                <p class="subtitle is-5 mb-5">Join Honeydew and take the stress out of running your household.</p>
                <a href="/signup" class="button is-primary is-large is-rounded">
                    <span class="icon">
                        <i class="fa-solid fa-user-plus"></i>
                    </span>
                    <span>Sign Up Free</span>
                </a>
                <p class="mt-4 has-text-grey">
                    Already have an account? Use a device that's already logged in to generate a <strong>magic link</strong>.
                </p>
            </div>
        </section>
    </div>
</template>

<style scoped lang="scss">
@import "../assets/variables.scss";

.landing-hero {
    background: linear-gradient(135deg, lighten($nord0, 45%) 0%, lighten($nord8, 30%) 100%);
    padding-bottom: 2rem;
}

.landing-logo {
    max-width: 220px;
    height: auto;
}

.landing-title {
    color: $nord0;
}

.landing-subtitle {
    color: $nord3;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
}

.feature-card {
    height: 100%;
    transition: transform 0.2s ease, box-shadow 0.2s ease;

    &:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
    }
}

.feature-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background-color: lighten($nord6, 2%);
}

.step-number {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background-color: $nord8;
    color: white;
    font-size: 1.4rem;
    font-weight: 700;
}

.landing-how-it-works {
    background-color: $nord6;
}

.landing-telegram-box {
    border-left: 4px solid $nord9;
}

.landing-cta {
    padding-top: 3rem;
    padding-bottom: 4rem;
}
</style>
