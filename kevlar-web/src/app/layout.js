import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "next-themes";
import { Inter } from "next/font/google";
import {
	Space_Grotesk,
	Source_Serif_4,
	JetBrains_Mono,
} from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

const fontSans = Space_Grotesk({
	subsets: ["latin"],
	variable: "--font-sans",
});

const fontSerif = Source_Serif_4({
	subsets: ["latin"],
	variable: "--font-serif",
});

const fontMono = JetBrains_Mono({
	subsets: ["latin"],
	variable: "--font-mono",
});

export const metadata = {
	title: "Kevlar",
	description: "Enterprise Digital Asset Management",
};

export default function RootLayout({ children }) {
	return (
		<ClerkProvider>
			<html lang="en" suppressHydrationWarning>
				<body
					className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable} font-sans antialiased`}
				>
					<ThemeProvider
						attribute="class"
						defaultTheme="dark"
						enableSystem
						disableTransitionOnChange
					>
						{children}
					</ThemeProvider>
				</body>
			</html>
		</ClerkProvider>
	);
}
