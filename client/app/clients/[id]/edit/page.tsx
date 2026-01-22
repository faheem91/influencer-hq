"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout";
import { ClientForm } from "@/components/clients";
import { storage } from "@/lib/storage";
import { Client, ClientFormData } from "@/types/client";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditClientPage() {
  const params = useParams();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const clientId = params.id as string;

  useEffect(() => {
    const clientData = storage.getClient(clientId);
    if (clientData) {
      setClient(clientData);
    } else {
      router.push("/clients");
    }
    setLoading(false);
  }, [clientId, router]);

  if (loading) {
    return (
      <DashboardLayout title="Edit Client" description="Loading...">
        <div className="mx-auto max-w-3xl space-y-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!client) {
    return null;
  }

  const initialData: ClientFormData = {
    name: client.name,
    logo: client.logo,
    description: client.description,
    tracking: client.tracking,
    imai: client.imai,
    checkInterval: client.checkInterval,
  };

  return (
    <DashboardLayout
      title={`Edit ${client.name}`}
      description="Update client details and tracking configuration"
    >
      <div className="mx-auto max-w-3xl">
        <ClientForm
          initialData={initialData}
          clientId={clientId}
          isEditing
        />
      </div>
    </DashboardLayout>
  );
}
