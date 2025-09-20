"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy, DocumentData, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// This function securely and efficiently fetches only the orders relevant to the logged-in artisan
async function fetchArtisanOrders(artisanId: string) {
    const ordersRef = collection(db, "orders");
    const q = query(
        ordersRef, 
        where("artisanIds", "array-contains", artisanId),
        orderBy("createdAt", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}


export default function ArtisanOrdersPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    
    const [orders, setOrders] = useState<DocumentData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading) {
            if (!user || user.role !== 'artisan') {
                router.push('/'); // Security: redirect non-artisans
            } else {
                fetchOrders(user.uid);
            }
        }
    }, [user, authLoading, router]);

    const fetchOrders = async (uid: string) => {
        setLoading(true);
        try {
            const userOrders = await fetchArtisanOrders(uid);
            setOrders(userOrders);
        } catch (error) {
            console.error("Error fetching artisan orders:", error);
            // This error often indicates a missing Firestore index.
        } finally {
            setLoading(false);
        }
    }

    // This function is called when the artisan clicks the button to signal they have prepared the order.
    const handleReadyForPickup = async (orderId: string) => {
        const orderDocRef = doc(db, "orders", orderId);
        await updateDoc(orderDocRef, { status: 'Ready for Pickup' });
        if(user) fetchOrders(user.uid); // Refresh the list to show the status change
    };

    // Helper function to identify new orders for a notification badge
    const isNewOrder = (orderDate: Date) => {
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setDate(twentyFourHoursAgo.getDate() - 1);
        return orderDate > twentyFourHoursAgo;
    };

    if (authLoading || loading) {
        return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>;
    }

    return (
        <div className="flex flex-1 flex-col gap-4">
            <div className="flex items-center">
                <h1 className="text-lg font-semibold md:text-2xl">Received Orders</h1>
            </div>
            {orders.length > 0 ? (
                <div className="space-y-6">
                    {orders.map(order => (
                        <Card key={order.id}>
                            <CardHeader className="flex flex-col md:flex-row md:items-start md:justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        Order #{order.id.substring(0, 8)}
                                        {/* Show a "New" badge for recent orders that are still being packaged */}
                                        {isNewOrder(new Date(order.createdAt.seconds * 1000)) && order.status === 'Packaging' && (
                                            <span className="text-xs font-semibold bg-green-100 text-green-800 px-2 py-1 rounded-full">New</span>
                                        )}
                                    </CardTitle>
                                    <CardDescription>
                                        Date: {new Date(order.createdAt.seconds * 1000).toLocaleDateString()}
                                    </CardDescription>
                                </div>
                                <div className="mt-2 text-sm md:mt-0 md:text-right">
                                    <p>Buyer: {order.shippingAddress.name || 'N/A'}</p>
                                    <p>Payment: <span className="font-semibold">{order.paymentStatus || 'Paid'}</span></p>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="mb-4">
                                    <h4 className="font-semibold">Your Items in this Order:</h4>
                                    {order.items
                                        .filter((item: any) => item.artisanId === user?.uid)
                                        .map((item: any) => (
                                        <div key={item.id} className="ml-4 py-2 border-b last:border-b-0">
                                            <p>{item.name} (Qty: {item.quantity})</p>
                                        </div>
                                    ))}
                                </div>
                                <details className="mb-4">
                                    <summary className="cursor-pointer font-semibold">View Shipping Address</summary>
                                    <div className="mt-2 p-3 bg-muted rounded-md text-sm">
                                        <p>{order.shippingAddress.line1}</p>
                                        {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
                                        <p>{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}</p>
                                        <p>Phone: {order.shippingAddress.phone}</p>
                                    </div>
                                </details>
                                <div className="flex items-center justify-between rounded-lg bg-muted p-3">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold">Order Status:</span>
                                        <span className="font-medium text-primary">{order.status}</span>
                                    </div>
                                    {/* The action button is only shown when the order is in the "Packaging" stage */}
                                    {order.status === 'Packaging' && (
                                        <Button onClick={() => handleReadyForPickup(order.id)}>
                                            Mark as Ready for Pickup
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 rounded-lg border-2 border-dashed">
                    <h2 className="text-2xl font-semibold">No Orders Yet</h2>
                    <p className="text-muted-foreground mt-2">When a buyer purchases one of your products, the order will appear here.</p>
                </div>
            )}
        </div>
    );
}

