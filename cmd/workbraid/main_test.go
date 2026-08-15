package main

import "testing"

func TestOriginForLoopbackAddress(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		address string
		want    string
		wantErr bool
	}{
		{name: "IPv4", address: "127.0.0.1:8080", want: "http://127.0.0.1:8080"},
		{name: "IPv6", address: "[::1]:8080", want: "http://[::1]:8080"},
		{name: "all interfaces", address: "0.0.0.0:8080", wantErr: true},
		{name: "host name", address: "localhost:8080", wantErr: true},
		{name: "dynamic port", address: "127.0.0.1:0", wantErr: true},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()
			got, err := originForLoopbackAddress(test.address)
			if test.wantErr {
				if err == nil {
					t.Fatalf("originForLoopbackAddress(%q) unexpectedly succeeded", test.address)
				}
				return
			}
			if err != nil {
				t.Fatalf("originForLoopbackAddress(%q): %v", test.address, err)
			}
			if got != test.want {
				t.Fatalf("originForLoopbackAddress(%q) = %q, want %q", test.address, got, test.want)
			}
		})
	}
}
