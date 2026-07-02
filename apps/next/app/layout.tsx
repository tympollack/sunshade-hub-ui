import { StylesProvider } from './styles-provider'
import { ThemeProvider } from './theme-provider'
import './globals.css'

export const metadata = {
  title: {
    default: 'SunShade Hub',
    template: 'SunShade | %s',
  },
  description: 'Decentralized · Privacy-First · Sustainable Infrastructure',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <StylesProvider>{children}</StylesProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
