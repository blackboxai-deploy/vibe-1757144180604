'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      // Redirect authenticated users to dashboard
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sand-50 to-cream-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-clay-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sand-50 via-cream-50 to-sand-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
            <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
              <div className="sm:text-center lg:text-left">
                <h1 className="text-4xl tracking-tight font-bold text-charcoal-900 sm:text-5xl md:text-6xl">
                  <span className="block xl:inline">Complete</span>{' '}
                  <span className="block text-clay-600 xl:inline">Inventory Management</span>
                </h1>
                <p className="mt-3 text-base text-charcoal-600 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                  Streamline your business operations with our comprehensive inventory management system. 
                  From product catalog to e-commerce storefront, manage everything in one place with 
                  role-based access control and complete audit trails.
                </p>
                <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                  <div className="rounded-2xl shadow">
                    <Link href="/auth/login">
                      <Button size="lg" className="w-full bg-clay-600 hover:bg-clay-700 text-white rounded-2xl px-8 py-3">
                        Get Started
                      </Button>
                    </Link>
                  </div>
                  <div className="mt-3 sm:mt-0 sm:ml-3">
                    <Link href="/storefront">
                      <Button variant="outline" size="lg" className="w-full border-clay-600 text-clay-600 hover:bg-clay-50 rounded-2xl px-8 py-3">
                        Browse Store
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
        <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
          <div className="h-56 w-full sm:h-72 md:h-96 lg:w-full lg:h-full bg-gradient-to-br from-clay-100 to-sand-200 flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 bg-clay-600 rounded-2xl flex items-center justify-center">
                <div className="w-12 h-12 bg-white rounded-xl"></div>
              </div>
              <p className="text-clay-700 text-lg font-medium">Modern Dashboard</p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-clay-600 font-semibold tracking-wide uppercase">Features</h2>
            <p className="mt-2 text-3xl leading-8 font-bold tracking-tight text-charcoal-900 sm:text-4xl">
              Everything you need to manage your inventory
            </p>
            <p className="mt-4 max-w-2xl text-xl text-charcoal-500 lg:mx-auto">
              Comprehensive tools for modern businesses with security and compliance in mind.
            </p>
          </div>

          <div className="mt-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="rounded-2xl border-0 shadow-lg bg-gradient-to-br from-white to-sand-50">
                <CardHeader>
                  <CardTitle className="text-charcoal-900">Role-Based Access Control</CardTitle>
                  <CardDescription className="text-charcoal-600">
                    Super Admin, Admin, and Subordinate roles with granular permissions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-charcoal-600 space-y-2">
                    <li>• Secure authentication with JWT</li>
                    <li>• Permission-based feature access</li>
                    <li>• Complete audit trail</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-0 shadow-lg bg-gradient-to-br from-white to-cream-50">
                <CardHeader>
                  <CardTitle className="text-charcoal-900">Inventory Management</CardTitle>
                  <CardDescription className="text-charcoal-600">
                    Real-time stock tracking across multiple warehouses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-charcoal-600 space-y-2">
                    <li>• Multi-warehouse support</li>
                    <li>• Stock movement tracking</li>
                    <li>• Automated reorder alerts</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-0 shadow-lg bg-gradient-to-br from-white to-clay-50">
                <CardHeader>
                  <CardTitle className="text-charcoal-900">E-commerce Integration</CardTitle>
                  <CardDescription className="text-charcoal-600">
                    Complete storefront with shopping cart and payments
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-charcoal-600 space-y-2">
                    <li>• Product catalog management</li>
                    <li>• Stripe payment integration</li>
                    <li>• Order management system</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-0 shadow-lg bg-gradient-to-br from-white to-sand-50">
                <CardHeader>
                  <CardTitle className="text-charcoal-900">Purchase Orders</CardTitle>
                  <CardDescription className="text-charcoal-600">
                    Streamlined procurement process with supplier management
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-charcoal-600 space-y-2">
                    <li>• Supplier relationship management</li>
                    <li>• Purchase order lifecycle</li>
                    <li>• Goods receipt notes</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-0 shadow-lg bg-gradient-to-br from-white to-cream-50">
                <CardHeader>
                  <CardTitle className="text-charcoal-900">Sales & Returns</CardTitle>
                  <CardDescription className="text-charcoal-600">
                    Complete order fulfillment and return management
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-charcoal-600 space-y-2">
                    <li>• Sales order processing</li>
                    <li>• Shipping integration</li>
                    <li>• Returns and refunds</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-0 shadow-lg bg-gradient-to-br from-white to-clay-50">
                <CardHeader>
                  <CardTitle className="text-charcoal-900">Analytics & Reports</CardTitle>
                  <CardDescription className="text-charcoal-600">
                    Comprehensive reporting with data export capabilities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-charcoal-600 space-y-2">
                    <li>• Inventory valuation reports</li>
                    <li>• Sales analytics</li>
                    <li>• CSV export functionality</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-clay-600">
        <div className="max-w-2xl mx-auto text-center py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            <span className="block">Ready to get started?</span>
            <span className="block">Start managing your inventory today.</span>
          </h2>
          <p className="mt-4 text-lg leading-6 text-clay-100">
            Join businesses already using our platform to streamline their operations.
          </p>
          <div className="mt-8 flex justify-center space-x-4">
            <Link href="/auth/register">
              <Button size="lg" variant="secondary" className="bg-white text-clay-600 hover:bg-sand-50 rounded-2xl px-8 py-3">
                Create Account
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-clay-700 rounded-2xl px-8 py-3">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}