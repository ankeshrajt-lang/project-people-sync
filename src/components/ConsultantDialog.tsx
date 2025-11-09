import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface ConsultantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consultant?: any;
}

export function ConsultantDialog({ open, onOpenChange, consultant }: ConsultantDialogProps) {
  const [name, setName] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [indeedUrl, setIndeedUrl] = useState("");
  const [monsterUrl, setMonsterUrl] = useState("");
  const [diceUrl, setDiceUrl] = useState("");
  const [ziprecruiterUrl, setZiprecruiterUrl] = useState("");
  const [linkedinUsername, setLinkedinUsername] = useState("");
  const [linkedinPassword, setLinkedinPassword] = useState("");
  const [indeedUsername, setIndeedUsername] = useState("");
  const [indeedPassword, setIndeedPassword] = useState("");
  const [monsterUsername, setMonsterUsername] = useState("");
  const [monsterPassword, setMonsterPassword] = useState("");
  const [diceUsername, setDiceUsername] = useState("");
  const [dicePassword, setDicePassword] = useState("");
  const [ziprecruiterUsername, setZiprecruiterUsername] = useState("");
  const [ziprecruiterPassword, setZiprecruiterPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [driversLicenseNumber, setDriversLicenseNumber] = useState("");
  const [driversLicenseState, setDriversLicenseState] = useState("");
  const [driversLicenseExpiry, setDriversLicenseExpiry] = useState("");
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open && consultant) {
      setName(consultant.name || "");
      setFullName(consultant.full_name || "");
      setPhone(consultant.phone || "");
      setEmail(consultant.email || "");
      setAddress(consultant.address || "");
      setLinkedinUrl(consultant.linkedin_url || "");
      setIndeedUrl(consultant.indeed_url || "");
      setMonsterUrl(consultant.monster_url || "");
      setDiceUrl(consultant.dice_url || "");
      setZiprecruiterUrl(consultant.ziprecruiter_url || "");
      setLinkedinUsername(consultant.linkedin_username || "");
      setLinkedinPassword(consultant.linkedin_password || "");
      setIndeedUsername(consultant.indeed_username || "");
      setIndeedPassword(consultant.indeed_password || "");
      setMonsterUsername(consultant.monster_username || "");
      setMonsterPassword(consultant.monster_password || "");
      setDiceUsername(consultant.dice_username || "");
      setDicePassword(consultant.dice_password || "");
      setZiprecruiterUsername(consultant.ziprecruiter_username || "");
      setZiprecruiterPassword(consultant.ziprecruiter_password || "");
      setDateOfBirth(consultant.date_of_birth || "");
      setDriversLicenseNumber(consultant.drivers_license_number || "");
      setDriversLicenseState(consultant.drivers_license_state || "");
      setDriversLicenseExpiry(consultant.drivers_license_expiry || "");
      setNotes(consultant.notes || "");
    } else if (open && !consultant) {
      resetForm();
    }
  }, [open, consultant]);

  const resetForm = () => {
    setName("");
    setFullName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setLinkedinUrl("");
    setIndeedUrl("");
    setMonsterUrl("");
    setDiceUrl("");
    setZiprecruiterUrl("");
    setLinkedinUsername("");
    setLinkedinPassword("");
    setIndeedUsername("");
    setIndeedPassword("");
    setMonsterUsername("");
    setMonsterPassword("");
    setDiceUsername("");
    setDicePassword("");
    setZiprecruiterUsername("");
    setZiprecruiterPassword("");
    setDateOfBirth("");
    setDriversLicenseNumber("");
    setDriversLicenseState("");
    setDriversLicenseExpiry("");
    setNotes("");
  };

  const saveConsultantMutation = useMutation({
    mutationFn: async () => {
      const consultantData = {
        name: name.trim(),
        full_name: fullName.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        linkedin_url: linkedinUrl.trim() || null,
        indeed_url: indeedUrl.trim() || null,
        monster_url: monsterUrl.trim() || null,
        dice_url: diceUrl.trim() || null,
        ziprecruiter_url: ziprecruiterUrl.trim() || null,
        linkedin_username: linkedinUsername.trim() || null,
        linkedin_password: linkedinPassword.trim() || null,
        indeed_username: indeedUsername.trim() || null,
        indeed_password: indeedPassword.trim() || null,
        monster_username: monsterUsername.trim() || null,
        monster_password: monsterPassword.trim() || null,
        dice_username: diceUsername.trim() || null,
        dice_password: dicePassword.trim() || null,
        ziprecruiter_username: ziprecruiterUsername.trim() || null,
        ziprecruiter_password: ziprecruiterPassword.trim() || null,
        date_of_birth: dateOfBirth || null,
        drivers_license_number: driversLicenseNumber.trim() || null,
        drivers_license_state: driversLicenseState.trim() || null,
        drivers_license_expiry: driversLicenseExpiry || null,
        notes: notes.trim() || null,
      };

      if (consultant) {
        const { error } = await supabase
          .from("consultants")
          .update(consultantData)
          .eq("id", consultant.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("consultants").insert(consultantData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consultants"] });
      toast.success(consultant ? "Consultant updated" : "Consultant added");
      onOpenChange(false);
      resetForm();
    },
    onError: () => {
      toast.error(consultant ? "Failed to update consultant" : "Failed to add consultant");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    saveConsultantMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{consultant ? "Edit Consultant" : "Add Consultant"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Satish Java"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g., Kumar S"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="6017329430"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="4759 Selkirk st fremont CA 94538"
            />
          </div>

          <div className="space-y-2">
            <Label>Online Profiles & Credentials</Label>
            
            <div className="space-y-2 p-3 border rounded-md">
              <Label className="text-sm font-semibold">LinkedIn</Label>
              <Input
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="LinkedIn URL"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={linkedinUsername}
                  onChange={(e) => setLinkedinUsername(e.target.value)}
                  placeholder="Username/Email"
                />
                <Input
                  type="password"
                  value={linkedinPassword}
                  onChange={(e) => setLinkedinPassword(e.target.value)}
                  placeholder="Password"
                />
              </div>
            </div>

            <div className="space-y-2 p-3 border rounded-md">
              <Label className="text-sm font-semibold">Indeed</Label>
              <Input
                value={indeedUrl}
                onChange={(e) => setIndeedUrl(e.target.value)}
                placeholder="Indeed URL"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={indeedUsername}
                  onChange={(e) => setIndeedUsername(e.target.value)}
                  placeholder="Username/Email"
                />
                <Input
                  type="password"
                  value={indeedPassword}
                  onChange={(e) => setIndeedPassword(e.target.value)}
                  placeholder="Password"
                />
              </div>
            </div>

            <div className="space-y-2 p-3 border rounded-md">
              <Label className="text-sm font-semibold">Monster</Label>
              <Input
                value={monsterUrl}
                onChange={(e) => setMonsterUrl(e.target.value)}
                placeholder="Monster URL"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={monsterUsername}
                  onChange={(e) => setMonsterUsername(e.target.value)}
                  placeholder="Username/Email"
                />
                <Input
                  type="password"
                  value={monsterPassword}
                  onChange={(e) => setMonsterPassword(e.target.value)}
                  placeholder="Password"
                />
              </div>
            </div>

            <div className="space-y-2 p-3 border rounded-md">
              <Label className="text-sm font-semibold">Dice</Label>
              <Input
                value={diceUrl}
                onChange={(e) => setDiceUrl(e.target.value)}
                placeholder="Dice URL"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={diceUsername}
                  onChange={(e) => setDiceUsername(e.target.value)}
                  placeholder="Username/Email"
                />
                <Input
                  type="password"
                  value={dicePassword}
                  onChange={(e) => setDicePassword(e.target.value)}
                  placeholder="Password"
                />
              </div>
            </div>

            <div className="space-y-2 p-3 border rounded-md">
              <Label className="text-sm font-semibold">ZipRecruiter</Label>
              <Input
                value={ziprecruiterUrl}
                onChange={(e) => setZiprecruiterUrl(e.target.value)}
                placeholder="ZipRecruiter URL"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={ziprecruiterUsername}
                  onChange={(e) => setZiprecruiterUsername(e.target.value)}
                  placeholder="Username/Email"
                />
                <Input
                  type="password"
                  value={ziprecruiterPassword}
                  onChange={(e) => setZiprecruiterPassword(e.target.value)}
                  placeholder="Password"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dlNumber">Driver's License Number</Label>
              <Input
                id="dlNumber"
                value={driversLicenseNumber}
                onChange={(e) => setDriversLicenseNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dlState">DL State</Label>
              <Input
                id="dlState"
                value={driversLicenseState}
                onChange={(e) => setDriversLicenseState(e.target.value)}
                placeholder="CA"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dlExpiry">DL Expiry</Label>
              <Input
                id="dlExpiry"
                type="date"
                value={driversLicenseExpiry}
                onChange={(e) => setDriversLicenseExpiry(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional information..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveConsultantMutation.isPending}>
              {consultant ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}