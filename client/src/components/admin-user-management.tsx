import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { Plus, Edit2, Trash2, Search, Loader2, UserX, UserCheck } from "lucide-react";
import { format } from "date-fns";

type UserFormData = z.infer<typeof insertUserSchema>;

interface User {
  id: number;
  username: string;
  email: string;
  birthday?: string;
  role: string;
  isBlocked: boolean;
}

export function AdminUserManagement() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const addUserForm = useForm<UserFormData>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      birthday: undefined,
      role: "user",
      isBlocked: false,
    },
  });

  const editUserForm = useForm<Partial<UserFormData>>({
    resolver: zodResolver(insertUserSchema.partial()),
  });

  const addUserMutation = useMutation({
    mutationFn: async (userData: UserFormData) => {
      const response = await apiRequest("POST", "/api/users", userData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User Added",
        description: "User has been successfully added.",
      });
      setIsAddDialogOpen(false);
      addUserForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, userData }: { id: number; userData: Partial<UserFormData> }) => {
      const response = await apiRequest("PUT", `/api/users/${id}`, userData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User Updated",
        description: "User has been successfully updated.",
      });
      setEditingUser(null);
      editUserForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/users/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User Deleted",
        description: "User has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const blockUserMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/users/${id}/block`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User Blocked",
        description: "User has been successfully blocked.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const unblockUserMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/users/${id}/unblock`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User Unblocked",
        description: "User has been successfully unblocked.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddUser = (data: UserFormData) => {
    addUserMutation.mutate(data);
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    editUserForm.reset({
      username: user.username,
      email: user.email,
      birthday: user.birthday,
      role: user.role,
      isBlocked: user.isBlocked,
    });
  };

  const handleBlockUser = (id: number) => {
    if (window.confirm("Are you sure you want to block this user?")) {
      blockUserMutation.mutate(id);
    }
  };

  const handleUnblockUser = (id: number) => {
    if (window.confirm("Are you sure you want to unblock this user?")) {
      unblockUserMutation.mutate(id);
    }
  };

  const handleUpdateUser = (data: Partial<UserFormData>) => {
    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser.id, userData: data });
    }
  };

  const handleDeleteUser = (id: number) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      deleteUserMutation.mutate(id);
    }
  };

  const filteredUsers = users.filter((user) =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>User Management</CardTitle>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
              </DialogHeader>
              <form onSubmit={addUserForm.handleSubmit(handleAddUser)} className="space-y-4">
                <div>
                  <Label htmlFor="add-username">Username</Label>
                  <Input
                    id="add-username"
                    {...addUserForm.register("username")}
                    placeholder="Enter username"
                  />
                  {addUserForm.formState.errors.username && (
                    <p className="text-sm text-red-600 mt-1">
                      {addUserForm.formState.errors.username.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="add-email">Email</Label>
                  <Input
                    id="add-email"
                    type="email"
                    {...addUserForm.register("email")}
                    placeholder="Enter email"
                  />
                  {addUserForm.formState.errors.email && (
                    <p className="text-sm text-red-600 mt-1">
                      {addUserForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="add-birthday">Birthday</Label>
                  <Input
                    id="add-birthday"
                    type="date"
                    {...addUserForm.register("birthday")}
                  />
                </div>

                <div>
                  <Label htmlFor="add-password">Password</Label>
                  <Input
                    id="add-password"
                    type="password"
                    {...addUserForm.register("password")}
                    placeholder="Enter password"
                  />
                  {addUserForm.formState.errors.password && (
                    <p className="text-sm text-red-600 mt-1">
                      {addUserForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="add-role">Role</Label>
                  <select
                    id="add-role"
                    {...addUserForm.register("role")}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="user">User</option>
                    <option value="vendor">Vendor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={addUserMutation.isPending}
                    className="flex-1"
                  >
                    {addUserMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Add User"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Users Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Birthday</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user: any) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.birthday ? format(new Date(user.birthday), "MMM dd, yyyy") : "Not set"}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.role === 'admin'
                        ? 'bg-purple-100 text-purple-800'
                        : user.role === 'vendor'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.isBlocked
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {user.isBlocked ? "Blocked" : "Active"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditUser(user)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      {user.isBlocked ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnblockUser(user.id)}
                          disabled={unblockUserMutation.isPending}
                        >
                          <UserCheck className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleBlockUser(user.id)}
                          disabled={blockUserMutation.isPending}
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Edit User Dialog */}
        {editingUser && (
          <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
              </DialogHeader>
              <form onSubmit={editUserForm.handleSubmit(handleUpdateUser)} className="space-y-4">
                <div>
                  <Label htmlFor="edit-username">Username</Label>
                  <Input
                    id="edit-username"
                    {...editUserForm.register("username")}
                    placeholder="Enter username"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    {...editUserForm.register("email")}
                    placeholder="Enter email"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-birthday">Birthday</Label>
                  <Input
                    id="edit-birthday"
                    type="date"
                    {...editUserForm.register("birthday")}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-role">Role</Label>
                  <select
                    id="edit-role"
                    {...editUserForm.register("role")}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="user">User</option>
                    <option value="vendor">Vendor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingUser(null)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateUserMutation.isPending}
                    className="flex-1"
                  >
                    {updateUserMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Update User"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}
