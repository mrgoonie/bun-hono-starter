import type { FC, PropsWithChildren } from 'hono/jsx';
import { Head } from './common/head';
import { Header } from './common/header';
import { Footer } from './common/footer';

const darkModeInitScript = `
  function initDarkMode() {
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  // Run initialization immediately
  initDarkMode();

  // Also run after DOM is fully loaded to ensure it applies correctly
  document.addEventListener('DOMContentLoaded', initDarkMode);
`;

const Master: FC = (props: PropsWithChildren) => {
	return (
		<html lang="en" className="dark:bg-gray-900 h-full">
			<head>
				<Head />
				<script dangerouslySetInnerHTML={{ __html: darkModeInitScript }} />
			</head>

			<body className="dark:text-white h-full">
				<div className="flex flex-col min-h-screen">
					<Header />

					{props.children}

					<Footer />
				</div>
			</body>
		</html>
	);
};

export default Master;
