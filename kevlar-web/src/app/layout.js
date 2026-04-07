import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export default function RootLayout({ children }) {
	return (
		<ClerkProvider>
			<html lang="en" className="dark">
				<body className="bg-secondary">{children}</body>
			</html>
		</ClerkProvider>
	);
}
