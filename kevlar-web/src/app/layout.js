import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export default function RootLayout({ children }) {
	return (
		<ClerkProvider>
			<html lang="en" className="dark">
				<body className="bg-slate-950 text-slate-50 antialiased min-h-screen">
					{children}
				</body>
			</html>
		</ClerkProvider>
	);
}
