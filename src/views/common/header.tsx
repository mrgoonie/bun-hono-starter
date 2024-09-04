import type { FC } from 'hono/jsx';

const darkModeScript = `
  function setupDarkModeToggle() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
      darkModeToggle.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
      });
    }
  }

  // Run setup when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupDarkModeToggle);
  } else {
    setupDarkModeToggle();
  }
`;

export const Header: FC = () => {
	return (
		<div class="p-2 dark:bg-gray-800 flex justify-between items-center">
			<h1 class="text-xl font-bold text-gray-800 dark:text-white">My App</h1>
			<button id="darkModeToggle" class="p-1.5 rounded-full bg-gray-200 dark:bg-gray-700">
				<svg
					class="w-5 h-5 text-gray-800 dark:text-white"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
					></path>
				</svg>
			</button>
			<script dangerouslySetInnerHTML={{ __html: darkModeScript }} />
		</div>
	);
};
